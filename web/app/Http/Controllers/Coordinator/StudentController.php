<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Http\Requests\Coordinator\UpdateStudentPlacementRequest;
use App\Models\Company;
use App\Models\OjtEvaluation;
use App\Models\Section;
use App\Models\Student;
use App\Models\StudentDocument;
use App\Models\Supervisor;
use App\Support\OjtProgressCalculator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentController extends Controller
{
    public function index(Request $request): Response
    {
        $section = $this->coordinatorSection($request);
        $students = $this->studentList($section);

        return Inertia::render('coordinator/students', [
            'section' => $this->sectionPayload($section),
            'students' => $students,
            'evaluation_stats' => $this->evaluationStats($section),
        ]);
    }

    public function show(Request $request, Student $student): Response
    {
        $section = $this->coordinatorSectionOrFail($request);
        $this->ensureStudentInSection($student, $section);

        $student->load([
            'user:id,name,email,is_active',
            'company:id,name',
            'department:id,name,company_id',
            'supervisor.user:id,name',
            'documents.documentType:id,code,name,is_required',
        ]);

        $requiredHours = (int) $section->course->required_hours;

        return Inertia::render('coordinator/students/show', [
            'section' => $this->sectionPayload($section),
            'student' => $this->studentPayload($student),
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
                    'download_url' => route('coordinators.students.documents.show', [
                        'student' => $student,
                        'document' => $document,
                    ]),
                ])
                ->all(),
            'companies' => $this->companyOptions($section),
            'supervisors' => $this->supervisorOptions($section),
            'evaluations' => $this->evaluationList($student),
            'can_open_evaluation' => $student->supervisor_id !== null
                && ! OjtEvaluation::query()
                    ->where('student_id', $student->id)
                    ->where('status', OjtEvaluation::STATUS_PENDING)
                    ->exists(),
        ]);
    }

    public function update(UpdateStudentPlacementRequest $request, Student $student): RedirectResponse
    {
        $validated = $request->validated();

        if (empty($validated['company_id'])) {
            $validated['department_id'] = null;
            $validated['supervisor_id'] = null;
        }

        if (empty($validated['department_id']) && ! empty($validated['supervisor_id'])) {
            $supervisor = Supervisor::query()->find($validated['supervisor_id']);
            $validated['department_id'] = $supervisor?->department_id;
        }

        $student->update([
            'company_id' => $validated['company_id'] ?? null,
            'department_id' => $validated['department_id'] ?? null,
            'supervisor_id' => $validated['supervisor_id'] ?? null,
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'OJT placement updated successfully.',
        ]);

        return redirect()->back();
    }

    public function showDocument(Request $request, Student $student, StudentDocument $document): StreamedResponse
    {
        $section = $this->coordinatorSectionOrFail($request);
        $this->ensureStudentInSection($student, $section);

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

    private function coordinatorSection(Request $request): ?Section
    {
        return Section::query()
            ->with([
                'course:id,code,name,required_hours',
                'schoolYear:id,name',
            ])
            ->where('coordinator_user_id', $request->user()->id)
            ->where('is_active', true)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_active', true))
            ->first();
    }

    private function coordinatorSectionOrFail(Request $request): Section
    {
        $section = $this->coordinatorSection($request);

        abort_if($section === null, 403, 'You are not assigned to a section yet.');

        return $section;
    }

    private function ensureStudentInSection(Student $student, Section $section): void
    {
        $student->loadMissing('section');

        abort_unless($student->section_id === $section->id, 404);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function sectionPayload(?Section $section): ?array
    {
        if ($section === null) {
            return null;
        }

        return [
            'id' => $section->id,
            'name' => $section->name,
            'display_name' => trim("{$section->course->code} {$section->name}"),
            'school_year' => $section->schoolYear?->name,
            'course' => [
                'code' => $section->course->code,
                'name' => $section->course->name,
                'required_hours' => $section->course->required_hours,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function studentPayload(Student $student): array
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
    private function studentList(?Section $section): array
    {
        if ($section === null) {
            return [];
        }

        return Student::query()
            ->with([
                'user:id,name,email,is_active',
                'company:id,name',
                'department:id,name,company_id',
                'supervisor.user:id,name',
            ])
            ->where('section_id', $section->id)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get()
            ->map(fn (Student $student) => $this->studentPayload($student))
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function companyOptions(?Section $section): array
    {
        if ($section === null) {
            return [];
        }

        return Company::query()
            ->with(['departments' => fn ($query) => $query->where('is_active', true)->orderBy('name')])
            ->where('course_id', $section->course_id)
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
    private function supervisorOptions(?Section $section): array
    {
        if ($section === null) {
            return [];
        }

        return Supervisor::query()
            ->with('user:id,name')
            ->where('is_active', true)
            ->whereHas('company', fn ($query) => $query->where('course_id', $section->course_id))
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

    /**
     * @return list<array<string, mixed>>
     */
    private function evaluationList(Student $student): array
    {
        return OjtEvaluation::query()
            ->with(['supervisor.user:id,name'])
            ->where('student_id', $student->id)
            ->orderByDesc('opened_at')
            ->get()
            ->map(fn (OjtEvaluation $evaluation) => [
                'id' => $evaluation->id,
                'status' => $evaluation->status,
                'rating' => $evaluation->rating,
                'comments' => $evaluation->comments,
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

    /**
     * @return array{eligible: int, pending: int, without_supervisor: int}
     */
    private function evaluationStats(?Section $section): array
    {
        if ($section === null) {
            return [
                'eligible' => 0,
                'pending' => 0,
                'without_supervisor' => 0,
            ];
        }

        $activeStudents = Student::query()
            ->where('section_id', $section->id)
            ->where('is_active', true)
            ->get();

        $pendingStudentIds = OjtEvaluation::query()
            ->where('status', OjtEvaluation::STATUS_PENDING)
            ->whereIn('student_id', $activeStudents->pluck('id'))
            ->pluck('student_id');

        return [
            'eligible' => $activeStudents
                ->whereNotNull('supervisor_id')
                ->whereNotIn('id', $pendingStudentIds)
                ->count(),
            'pending' => $pendingStudentIds->unique()->count(),
            'without_supervisor' => $activeStudents->whereNull('supervisor_id')->count(),
        ];
    }
}
