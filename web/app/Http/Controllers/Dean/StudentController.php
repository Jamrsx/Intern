<?php

namespace App\Http\Controllers\Dean;

use App\Http\Controllers\Concerns\ResolvesDeanPortalPresentation;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Dean\Concerns\ResolvesDeanScope;
use App\Http\Requests\Dean\BulkStoreStudentRequest;
use App\Http\Requests\Dean\StoreStudentRequest;
use App\Models\Company;
use App\Models\Course;
use App\Models\OjtAbsence;
use App\Models\OjtEvaluation;
use App\Models\Section;
use App\Models\Student;
use App\Models\StudentDocument;
use App\Models\Supervisor;
use App\Models\TimeLogTaskPhoto;
use App\Support\DeanPortalScope;
use App\Support\OjtProgressCalculator;
use App\Support\StudentAccountService;
use App\Support\StudentAttendanceJournal;
use App\Support\StudentTaskPhotoJournal;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentController extends Controller
{
    use ResolvesDeanPortalPresentation;
    use ResolvesDeanScope;

    public function index(Request $request): Response
    {
        $course = $this->deanCourse($request);

        $sections = $this->availableSections($course, $request);
        $students = $this->studentList($course, $request);
        $companies = $this->companyOptions($course);
        $supervisors = $this->supervisorOptions($course);

        return $this->deanPortalRender('students', [
            'course' => $this->deanPortalContextPayload($request),
            'sections' => $sections,
            'students' => $students,
            'companies' => $companies,
            'supervisors' => $supervisors,
        ]);
    }

    public function store(StoreStudentRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $result = DB::transaction(fn () => app(StudentAccountService::class)->create([
            ...$validated,
            'password' => $validated['password'] ?? StudentAccountService::DEFAULT_PASSWORD,
        ]));

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Student {$result['student']->fullName()} created. Temporary password: {$result['password']}",
        ]);

        return redirect()->route('deans.students.index');
    }

    public function bulkStore(BulkStoreStudentRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $service = app(StudentAccountService::class);
        $fallbackSectionId = $validated['section_id'] ?? null;
        $createdCount = 0;

        DB::transaction(function () use ($validated, $service, $fallbackSectionId, &$createdCount) {
            foreach ($validated['students'] as $studentData) {
                $sectionId = $studentData['section_id'] ?? $fallbackSectionId;

                $service->create([
                    ...$studentData,
                    'email' => $studentData['email'] ?? $service->generatedBulkEmail($studentData['student_number']),
                    'section_id' => $sectionId,
                ]);

                $createdCount++;
            }
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "{$createdCount} student account(s) created. Default password is \"".StudentAccountService::DEFAULT_PASSWORD.'" for each account.',
        ]);

        return redirect()->route('deans.students.index');
    }

    public function show(Request $request, Student $student): Response
    {
        $course = $this->deanCourseOrFail($request);
        $this->ensureStudentInDeanScope($student, $request);

        $student->load([
            'user:id,name,email,is_active',
            'section.schoolYear:id,name',
            'section.course:id,code,name,required_hours',
            'company:id,name',
            'department:id,name,company_id',
            'supervisor.user:id,name',
            'documents.documentType:id,code,name,is_required',
            'ojtSchedule',
        ])->loadCount('documents');

        $section = $student->section;
        abort_if($section === null, 404);

        $requiredHours = (int) $course->required_hours;
        $portalKey = $this->deanPortalKey();

        return Inertia::render('deans/students/show', [
            'course' => $this->deanPortalContextPayload($request),
            'section' => $this->sectionPayload($section, $course),
            'student' => $this->studentDetailPayload($student),
            'progress' => OjtProgressCalculator::forStudent($student, $requiredHours),
            'documents' => $student->documents
                ->sortByDesc('uploaded_at')
                ->values()
                ->map(fn (StudentDocument $document) => [
                    'id' => $document->id,
                    'document_type' => $document->documentType->name,
                    'document_type_code' => $document->documentType->code,
                    'is_required' => $document->documentType->is_required,
                    'original_filename' => $document->original_filename,
                    'file_size' => $document->file_size,
                    'mime_type' => $document->mime_type,
                    'uploaded_at' => $document->uploaded_at->toIso8601String(),
                    'notes' => $document->notes,
                    'download_url' => route("{$portalKey}.students.documents.show", [
                        'student' => $student,
                        'document' => $document,
                    ]),
                ])
                ->all(),
            'evaluations' => $this->evaluationList($student),
            'task_photo_journal' => StudentTaskPhotoJournal::forStudent(
                $student,
                fn (TimeLogTaskPhoto $photo) => route("{$portalKey}.students.task-photos.show", [
                    'student' => $student,
                    'taskPhoto' => $photo,
                ]),
            ),
            'attendance_journal' => StudentAttendanceJournal::forStudent(
                $student,
                fn (OjtAbsence $absence) => route("{$portalKey}.students.absences.proof.show", [
                    'student' => $student,
                    'absence' => $absence,
                ]),
            ),
        ]);
    }

    public function showDocument(
        Request $request,
        Student $student,
        StudentDocument $document,
    ): StreamedResponse {
        $this->ensureStudentInDeanScope($student, $request);

        abort_unless($document->student_id === $student->id, 404);
        abort_unless(Storage::disk('local')->exists($document->file_path), 404);

        return Storage::disk('local')->response(
            $document->file_path,
            $document->original_filename,
            [
                'Content-Type' => $document->mime_type,
                'Content-Disposition' => 'inline; filename="'.$document->original_filename.'"',
            ],
        );
    }

    public function showTaskPhoto(
        Request $request,
        Student $student,
        TimeLogTaskPhoto $taskPhoto,
    ): StreamedResponse {
        $this->ensureStudentInDeanScope($student, $request);

        abort_unless($taskPhoto->student_id === $student->id, 404);
        abort_unless($taskPhoto->status === TimeLogTaskPhoto::STATUS_SUBMITTED, 404);
        abort_unless(Storage::disk('local')->exists($taskPhoto->file_path), 404);

        return Storage::disk('local')->response(
            $taskPhoto->file_path,
            $taskPhoto->original_filename,
            [
                'Content-Type' => $taskPhoto->mime_type,
                'Content-Disposition' => 'inline; filename="'.$taskPhoto->original_filename.'"',
            ],
        );
    }

    public function showAbsenceProof(
        Request $request,
        Student $student,
        OjtAbsence $absence,
    ) {
        $this->ensureStudentInDeanScope($student, $request);

        abort_unless($absence->student_id === $student->id, 404);
        abort_unless($absence->proof_file_path !== null, 404);
        abort_unless(Storage::disk('local')->exists($absence->proof_file_path), 404);

        return response()->file(
            Storage::disk('local')->path($absence->proof_file_path),
            [
                'Content-Type' => $absence->proof_mime_type ?? 'image/jpeg',
                'Content-Disposition' => 'inline; filename="'.($absence->proof_original_filename ?? 'proof.jpg').'"',
            ],
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function availableSections(?Course $course, ?Request $request = null): array
    {
        if ($course === null || $request === null) {
            return [];
        }

        return $this->deanSectionsQuery($request)
            ->with([
                'schoolYear:id,name,is_active',
                'coordinator:id,name,email',
            ])
            ->where('is_active', true)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_active', true))
            ->orderBy('name')
            ->get()
            ->map(fn (Section $section) => [
                'id' => $section->id,
                'name' => $section->name,
                'display_name' => trim("{$course->code} {$section->name}"),
                'school_year' => $section->schoolYear?->name,
                'coordinator' => $section->coordinator ? [
                    'id' => $section->coordinator->id,
                    'name' => $section->coordinator->name,
                    'email' => $section->coordinator->email,
                ] : null,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function studentList(?Course $course, ?Request $request = null): array
    {
        if ($course === null || $request === null) {
            return [];
        }

        return DeanPortalScope::studentsQuery($request->user())
            ->with([
                'user:id,name,email,is_active',
                'section.schoolYear:id,name',
                'section.coordinator:id,name,email',
                'company:id,name',
                'department:id,name,company_id',
                'supervisor.user:id,name',
            ])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get()
            ->map(fn (Student $student) => [
                'id' => $student->id,
                'student_number' => $student->student_number,
                'email' => $student->user->email,
                'first_name' => $student->first_name,
                'middle_name' => $student->middle_name,
                'last_name' => $student->last_name,
                'full_name' => $student->fullName(),
                'section_id' => $student->section_id,
                'section' => $student->section ? [
                    'id' => $student->section->id,
                    'display_name' => trim("{$course->code} {$student->section->name}"),
                    'school_year' => $student->section->schoolYear?->name,
                    'coordinator' => $student->section->coordinator ? [
                        'id' => $student->section->coordinator->id,
                        'name' => $student->section->coordinator->name,
                        'email' => $student->section->coordinator->email,
                    ] : null,
                ] : null,
                'company_id' => $student->company_id,
                'company' => $student->company ? [
                    'id' => $student->company->id,
                    'name' => $student->company->name,
                ] : null,
                'department_id' => $student->department_id,
                'department' => $student->department ? [
                    'id' => $student->department->id,
                    'name' => $student->department->name,
                ] : null,
                'supervisor_id' => $student->supervisor_id,
                'supervisor' => $student->supervisor ? [
                    'id' => $student->supervisor->id,
                    'name' => $student->supervisor->user->name,
                ] : null,
                'is_active' => $student->is_active,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function companyOptions(?Course $course): array
    {
        if ($course === null) {
            return [];
        }

        return Company::query()
            ->with(['departments' => fn ($query) => $query->where('is_active', true)->orderBy('name')])
            ->where('course_id', $course->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(fn (Company $company) => [
                'id' => $company->id,
                'name' => $company->name,
                'departments' => $company->departments->map(fn ($department) => [
                    'id' => $department->id,
                    'name' => $department->name,
                ])->values()->all(),
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function supervisorOptions(?Course $course): array
    {
        if ($course === null) {
            return [];
        }

        return Supervisor::query()
            ->with('user:id,name')
            ->where('is_active', true)
            ->whereHas('company', fn ($query) => $query->where('course_id', $course->id))
            ->orderBy('id')
            ->get()
            ->map(fn (Supervisor $supervisor) => [
                'id' => $supervisor->id,
                'name' => $supervisor->user->name,
                'company_id' => $supervisor->company_id,
                'department_id' => $supervisor->department_id,
            ])
            ->values()
            ->all();
    }

    private function ensureStudentInDeanScope(Student $student, Request $request): void
    {
        $user = $request->user();

        abort_unless(
            $user !== null && DeanPortalScope::studentBelongsToScope($user, $student),
            404,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function sectionPayload(Section $section, Course $course): array
    {
        return [
            'id' => $section->id,
            'name' => $section->name,
            'display_name' => trim("{$course->code} {$section->name}"),
            'school_year' => $section->schoolYear?->name,
            'course' => [
                'code' => $course->code,
                'name' => $course->name,
                'required_hours' => $course->required_hours,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function studentDetailPayload(Student $student): array
    {
        return [
            'id' => $student->id,
            'student_number' => $student->student_number,
            'email' => $student->user->email,
            'first_name' => $student->first_name,
            'middle_name' => $student->middle_name,
            'last_name' => $student->last_name,
            'full_name' => $student->fullName(),
            'company_id' => $student->company_id,
            'company' => $student->company ? [
                'id' => $student->company->id,
                'name' => $student->company->name,
            ] : null,
            'department_id' => $student->department_id,
            'department' => $student->department ? [
                'id' => $student->department->id,
                'name' => $student->department->name,
            ] : null,
            'supervisor_id' => $student->supervisor_id,
            'supervisor' => $student->supervisor ? [
                'id' => $student->supervisor->id,
                'name' => $student->supervisor->user->name,
            ] : null,
            'is_active' => $student->is_active,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function evaluationList(Student $student): array
    {
        return OjtEvaluation::query()
            ->with(['supervisor.user:id,name', 'template:id,name'])
            ->where('student_id', $student->id)
            ->orderByDesc('opened_at')
            ->get()
            ->map(fn (OjtEvaluation $evaluation) => [
                'id' => $evaluation->id,
                'status' => $evaluation->status,
                'template' => $evaluation->template ? [
                    'id' => $evaluation->template->id,
                    'name' => $evaluation->template->name,
                ] : null,
                'rating' => $evaluation->rating,
                'comments' => $evaluation->comments,
                'responses' => $evaluation->responses ?? [],
                'evaluation_date' => $evaluation->evaluation_date?->toDateString(),
                'opened_at' => $evaluation->opened_at->toIso8601String(),
                'submitted_at' => $evaluation->submitted_at?->toIso8601String(),
                'supervisor' => [
                    'id' => $evaluation->supervisor_id,
                    'name' => $evaluation->supervisor->user->name,
                ],
            ])
            ->values()
            ->all();
    }
}
