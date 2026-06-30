<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Coordinator\Concerns\FormatsEvaluationTemplates;
use App\Http\Controllers\Coordinator\Concerns\ResolvesCoordinatorCourse;
use App\Http\Requests\Coordinator\BulkStoreStudentRequest;
use App\Http\Requests\Coordinator\StoreStudentRequest;
use App\Http\Requests\Coordinator\UpdateCoordinatorStudentRequest;
use App\Models\Company;
use App\Models\OjtEvaluation;
use App\Models\Section;
use App\Models\Student;
use App\Models\StudentDocument;
use App\Models\Supervisor;
use App\Support\EvaluationAlertService;
use App\Support\OjtProgressCalculator;
use App\Support\StudentAccountService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentController extends Controller
{
    use FormatsEvaluationTemplates;
    use ResolvesCoordinatorCourse;

    public function index(Request $request): Response
    {
        $section = $this->coordinatorSection($request);
        $students = $this->studentList($section);

        return Inertia::render('coordinator/students', [
            'section' => $this->coordinatorSectionPayload($section),
            'students' => $students,
            'companies' => $this->companyOptions($section),
            'supervisors' => $this->supervisorOptions($section),
            'evaluation_stats' => $this->evaluationStats($section),
            'evaluation_templates' => $this->evaluationTemplateOptions($section),
            'evaluation_alerts' => $section !== null
                ? EvaluationAlertService::coordinatorAlerts($section)
                : null,
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
        ])->loadCount('documents');

        $requiredHours = (int) $section->course->required_hours;

        return Inertia::render('coordinator/students/show', [
            'section' => $this->coordinatorSectionPayload($section),
            'student' => $this->studentPayload($student, $section),
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
            'evaluations' => $this->evaluationList($student, $section),
            'evaluation_alerts' => EvaluationAlertService::coordinatorAlerts($section),
            'evaluation_templates' => $this->evaluationTemplateOptions($section),
            'can_open_evaluation' => $student->supervisor_id !== null
                && ! OjtEvaluation::query()
                    ->where('student_id', $student->id)
                    ->where('status', OjtEvaluation::STATUS_PENDING)
                    ->exists(),
        ]);
    }

    public function store(StoreStudentRequest $request): RedirectResponse
    {
        $section = $this->coordinatorSectionOrFail($request);
        $validated = $request->validated();

        $result = DB::transaction(fn () => app(StudentAccountService::class)->create([
            ...$validated,
            'section_id' => $section->id,
        ]));

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Student {$result['student']->fullName()} created. Temporary password: {$result['password']}",
        ]);

        return redirect()->route('coordinators.students.index');
    }

    public function bulkStore(BulkStoreStudentRequest $request): RedirectResponse
    {
        $section = $this->coordinatorSectionOrFail($request);
        $validated = $request->validated();
        $service = app(StudentAccountService::class);
        $createdCount = 0;

        DB::transaction(function () use ($validated, $section, $service, &$createdCount) {
            foreach ($validated['students'] as $studentData) {
                $service->create([
                    ...$studentData,
                    'email' => $studentData['email'] ?? $service->generatedBulkEmail($studentData['student_number']),
                    'section_id' => $section->id,
                ]);

                $createdCount++;
            }
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "{$createdCount} student account(s) created. Default password is \"".StudentAccountService::DEFAULT_PASSWORD.'" for each account.',
        ]);

        return redirect()->route('coordinators.students.index');
    }

    public function update(UpdateCoordinatorStudentRequest $request, Student $student): RedirectResponse
    {
        $section = $this->coordinatorSectionOrFail($request);
        $this->ensureStudentInSection($student, $section);
        $validated = $request->validated();

        $hasAccountUpdate = collect([
            'student_number',
            'email',
            'first_name',
            'middle_name',
            'last_name',
            'is_active',
        ])->contains(fn (string $field) => array_key_exists($field, $validated));

        $hasPlacementUpdate = collect([
            'company_id',
            'department_id',
            'supervisor_id',
        ])->contains(fn (string $field) => array_key_exists($field, $validated));

        DB::transaction(function () use ($student, $validated, $request, $hasAccountUpdate, $hasPlacementUpdate) {
            if ($hasAccountUpdate) {
                $isActive = array_key_exists('is_active', $validated)
                    ? $request->boolean('is_active')
                    : $student->is_active;

                if (isset($validated['first_name'], $validated['last_name'], $validated['email'])) {
                    $student->user->update([
                        'name' => app(StudentAccountService::class)->fullName(
                            $validated['first_name'],
                            $validated['middle_name'] ?? null,
                            $validated['last_name'],
                        ),
                        'email' => $validated['email'],
                        'is_active' => $isActive,
                    ]);

                    $student->update([
                        'student_number' => $validated['student_number'] ?? $student->student_number,
                        'first_name' => $validated['first_name'],
                        'middle_name' => $validated['middle_name'] ?? null,
                        'last_name' => $validated['last_name'],
                        'is_active' => $isActive,
                    ]);
                } elseif (array_key_exists('is_active', $validated)) {
                    $student->user->update(['is_active' => $isActive]);
                    $student->update(['is_active' => $isActive]);
                }
            }

            if ($hasPlacementUpdate) {
                $student->update($this->normalizedPlacementAttributes($validated));
            }
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $hasPlacementUpdate && ! $hasAccountUpdate
                ? 'OJT placement updated successfully.'
                : 'Student updated successfully.',
        ]);

        return redirect()->back();
    }

    public function destroy(Request $request, Student $student): RedirectResponse
    {
        $section = $this->coordinatorSectionOrFail($request);
        $this->ensureStudentInSection($student, $section);

        DB::transaction(function () use ($student) {
            $student->update(['is_active' => false]);
            $student->user->update(['is_active' => false]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Student account deactivated.',
        ]);

        return redirect()->route('coordinators.students.index');
    }

    public function mailCredentials(Request $request, Student $student): RedirectResponse
    {
        $section = $this->coordinatorSectionOrFail($request);
        $this->ensureStudentInSection($student, $section);
        abort_unless($student->is_active && $student->user->is_active, 422);

        try {
            app(StudentAccountService::class)->sendCredentials($student);
        } catch (\Throwable $exception) {
            report($exception);

            Inertia::flash('toast', [
                'type' => 'error',
                'message' => "Could not send credentials to {$student->fullName()}.",
            ]);

            return redirect()->route('coordinators.students.index');
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Login credentials sent to {$student->fullName()}.",
        ]);

        return redirect()->route('coordinators.students.index');
    }

    public function mailAllCredentials(Request $request): RedirectResponse
    {
        $section = $this->coordinatorSectionOrFail($request);

        $students = Student::query()
            ->with('user')
            ->where('section_id', $section->id)
            ->where('is_active', true)
            ->whereHas('user', fn ($query) => $query->where('is_active', true))
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        if ($students->isEmpty()) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'No active students found to email.',
            ]);

            return redirect()->route('coordinators.students.index');
        }

        $service = app(StudentAccountService::class);
        $sentCount = 0;
        $failedCount = 0;

        foreach ($students as $student) {
            try {
                $service->sendCredentials($student);
                $sentCount++;
            } catch (\Throwable $exception) {
                report($exception);
                $failedCount++;
            }
        }

        if ($sentCount === 0) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Could not send credentials to any students.',
            ]);

            return redirect()->route('coordinators.students.index');
        }

        $message = "Login credentials sent to {$sentCount} student(s).";

        if ($failedCount > 0) {
            $message .= " {$failedCount} email(s) failed.";
        }

        Inertia::flash('toast', [
            'type' => $failedCount > 0 ? 'error' : 'success',
            'message' => $message,
        ]);

        return redirect()->route('coordinators.students.index');
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

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, int|null>
     */
    private function normalizedPlacementAttributes(array $validated): array
    {
        $companyId = $validated['company_id'] ?? null;
        $departmentId = $validated['department_id'] ?? null;
        $supervisorId = $validated['supervisor_id'] ?? null;

        if (empty($companyId)) {
            return [
                'company_id' => null,
                'department_id' => null,
                'supervisor_id' => null,
            ];
        }

        if (empty($departmentId) && ! empty($supervisorId)) {
            $supervisor = Supervisor::query()->find($supervisorId);
            $departmentId = $supervisor?->department_id;
        }

        return [
            'company_id' => $companyId,
            'department_id' => $departmentId,
            'supervisor_id' => $supervisorId,
        ];
    }

    private function ensureStudentInSection(Student $student, Section $section): void
    {
        $student->loadMissing('section');

        abort_unless($student->section_id === $section->id, 404);
    }

    /**
     * @return array<string, mixed>
     */
    private function studentPayload(Student $student, ?Section $section = null): array
    {
        $pendingEvaluation = OjtEvaluation::query()
            ->with('template:id,name')
            ->where('student_id', $student->id)
            ->where('status', OjtEvaluation::STATUS_PENDING)
            ->latest('opened_at')
            ->first();

        $latestCompleted = OjtEvaluation::query()
            ->with('template:id,name')
            ->where('student_id', $student->id)
            ->where('status', OjtEvaluation::STATUS_COMPLETED)
            ->latest('submitted_at')
            ->first();

        $completedIsNew = $latestCompleted !== null
            && $section !== null
            && EvaluationAlertService::isCompletedEvaluationNew(
                $latestCompleted,
                $section->evaluation_completed_alerts_seen_at,
            );

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
            'documents_count' => (int) ($student->documents_count ?? $student->documents()->count()),
            'has_submitted_documents' => (int) ($student->documents_count ?? $student->documents()->count()) > 0,
            'latest_document_uploaded_at' => $student->latest_document_uploaded_at
                ? (string) $student->latest_document_uploaded_at
                : null,
            'evaluation_status' => $pendingEvaluation !== null
                ? 'pending_supervisor'
                : ($latestCompleted !== null ? 'completed' : 'none'),
            'pending_evaluation' => $pendingEvaluation ? [
                'id' => $pendingEvaluation->id,
                'template_name' => $pendingEvaluation->template?->name,
                'opened_at' => $pendingEvaluation->opened_at->toIso8601String(),
            ] : null,
            'latest_completed_evaluation' => $latestCompleted ? [
                'id' => $latestCompleted->id,
                'template_name' => $latestCompleted->template?->name,
                'submitted_at' => $latestCompleted->submitted_at?->toIso8601String(),
                'is_new' => $completedIsNew,
            ] : null,
            'has_new_completed_evaluation' => $completedIsNew,
            'ojt_start_date' => $student->ojtSchedule?->start_date?->toDateString(),
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
                'ojtSchedule:id,student_id,start_date',
            ])
            ->withCount('documents')
            ->withMax('documents as latest_document_uploaded_at', 'uploaded_at')
            ->where('section_id', $section->id)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get()
            ->map(fn (Student $student) => $this->studentPayload($student, $section))
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
    private function evaluationList(Student $student, Section $section): array
    {
        return OjtEvaluation::query()
            ->with(['supervisor.user:id,name', 'template:id,name'])
            ->where('student_id', $student->id)
            ->orderByDesc('opened_at')
            ->get()
            ->map(fn (OjtEvaluation $evaluation) => [
                'id' => $evaluation->id,
                'status' => $evaluation->status,
                'is_new' => $evaluation->status === OjtEvaluation::STATUS_COMPLETED
                    && EvaluationAlertService::isCompletedEvaluationNew(
                        $evaluation,
                        $section->evaluation_completed_alerts_seen_at,
                    ),
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
                'new_completed' => 0,
            ];
        }

        $alerts = EvaluationAlertService::coordinatorAlerts($section);

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
            'new_completed' => $alerts['new_completed_count'],
        ];
    }
}
