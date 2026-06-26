<?php

namespace App\Http\Controllers\Dean;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Dean\Concerns\ResolvesDeanScope;
use App\Http\Requests\Dean\BulkStoreStudentRequest;
use App\Http\Requests\Dean\StoreStudentRequest;
use App\Http\Requests\Dean\UpdateStudentRequest;
use App\Mail\StudentAccountCredentialsMail;
use App\Models\Company;
use App\Models\Course;
use App\Models\CourseMajor;
use App\Models\Role;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\Supervisor;
use App\Models\User;
use App\Support\DeanPortalScope;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
    use ResolvesDeanScope;

    public function index(Request $request): Response
    {
        $course = $this->deanCourse($request);

        $sections = $this->availableSections($course, $request);
        $students = $this->studentList($course, $request);
        $companies = $this->companyOptions($course);
        $supervisors = $this->supervisorOptions($course);

        return Inertia::render('deans/students', [
            'course' => $this->deanPortalContextPayload($request),
            'sections' => $sections,
            'students' => $students,
            'companies' => $companies,
            'supervisors' => $supervisors,
        ]);
    }

    public function store(StoreStudentRequest $request): RedirectResponse
    {
        $this->deanCourseOrFail($request);

        $result = DB::transaction(fn () => $this->createStudent(
            $request->validated(),
        ));

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Student {$result['student']->fullName()} created. Temporary password: {$result['password']}",
        ]);

        return redirect()->route('deans.students.index');
    }

    public function bulkStore(BulkStoreStudentRequest $request): RedirectResponse
    {
        $course = $this->deanCourseOrFail($request);
        $validated = $request->validated();
        $createdCount = 0;
        $createdSectionNames = [];

        DB::transaction(function () use ($request, $course, $validated, &$createdCount, &$createdSectionNames) {
            $sectionIdCache = [];

            foreach ($validated['students'] as $studentData) {
                $sectionLabel = $studentData['section_label'] ?? null;
                $requestedSectionId = $studentData['section_id'] ?? $validated['section_id'] ?? null;
                $cacheKey = $requestedSectionId !== null
                    ? 'id:'.$requestedSectionId
                    : 'label:'.strtolower(trim((string) $sectionLabel));

                if (! isset($sectionIdCache[$cacheKey])) {
                    [$resolvedSectionId, $wasCreated] = $this->resolveOrCreateSectionId(
                        $request,
                        $course,
                        $requestedSectionId !== null ? (int) $requestedSectionId : null,
                        $sectionLabel,
                    );

                    $sectionIdCache[$cacheKey] = $resolvedSectionId;

                    if ($wasCreated && $sectionLabel !== null) {
                        $createdSectionNames[strtolower(trim($sectionLabel))] = trim($sectionLabel);
                    }
                }

                $this->createStudent([
                    ...$studentData,
                    'email' => $studentData['email'] ?? $this->generatedBulkEmail($studentData['student_number']),
                    'section_id' => $sectionIdCache[$cacheKey],
                ]);

                $createdCount++;
            }
        });

        $createdSectionCount = count($createdSectionNames);

        $message = "{$createdCount} student account(s) created. Default passwords were generated for each account.";

        if ($createdSectionCount > 0) {
            $message .= " {$createdSectionCount} new section(s) were created from the import.";
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $message,
        ]);

        return redirect()->route('deans.students.index');
    }

    public function update(UpdateStudentRequest $request, Student $student): RedirectResponse
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

        DB::transaction(function () use ($student, $validated, $request) {
            $isActive = $request->boolean('is_active', $student->is_active);

            $student->user->update([
                'name' => $this->fullName(
                    $validated['first_name'],
                    $validated['middle_name'] ?? null,
                    $validated['last_name'],
                ),
                'email' => $validated['email'],
                'is_active' => $isActive,
            ]);

            $student->update([
                'student_number' => $validated['student_number'],
                'first_name' => $validated['first_name'],
                'middle_name' => $validated['middle_name'] ?? null,
                'last_name' => $validated['last_name'],
                'section_id' => $validated['section_id'],
                'company_id' => $validated['company_id'] ?? null,
                'department_id' => $validated['department_id'] ?? null,
                'supervisor_id' => $validated['supervisor_id'] ?? null,
                'is_active' => $isActive,
            ]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Student updated successfully.',
        ]);

        return redirect()->route('deans.students.index');
    }

    public function mailCredentials(Request $request, Student $student): RedirectResponse
    {
        $this->deanCourseOrFail($request);
        $student->loadMissing('section');
        abort_unless(
            $student->section !== null
                && DeanPortalScope::sectionBelongsToScope($request->user(), $student->section),
            404,
        );
        abort_unless($student->is_active && $student->user->is_active, 422);

        try {
            $this->sendStudentCredentials($student);
        } catch (\Throwable $exception) {
            report($exception);

            Inertia::flash('toast', [
                'type' => 'error',
                'message' => "Could not send credentials to {$student->fullName()}.",
            ]);

            return redirect()->route('deans.students.index');
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Login credentials sent to {$student->fullName()}.",
        ]);

        return redirect()->route('deans.students.index');
    }

    public function mailAllCredentials(Request $request): RedirectResponse
    {
        $this->deanCourseOrFail($request);

        $user = $request->user();

        $students = $user
            ? DeanPortalScope::studentsQuery($user)
                ->with('user')
                ->where('is_active', true)
                ->whereHas('user', fn ($query) => $query->where('is_active', true))
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->get()
            : collect();

        if ($students->isEmpty()) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'No active students found to email.',
            ]);

            return redirect()->route('deans.students.index');
        }

        $sentCount = 0;
        $failedCount = 0;

        foreach ($students as $student) {
            try {
                $this->sendStudentCredentials($student);
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

            return redirect()->route('deans.students.index');
        }

        $message = "Login credentials sent to {$sentCount} student(s).";

        if ($failedCount > 0) {
            $message .= " {$failedCount} email(s) failed.";
        }

        Inertia::flash('toast', [
            'type' => $failedCount > 0 ? 'error' : 'success',
            'message' => $message,
        ]);

        return redirect()->route('deans.students.index');
    }

    public function destroy(Request $request, Student $student): RedirectResponse
    {
        $this->deanCourseOrFail($request);
        $student->loadMissing('section');
        abort_unless(
            $student->section !== null
                && DeanPortalScope::sectionBelongsToScope($request->user(), $student->section),
            404,
        );

        DB::transaction(function () use ($student) {
            $student->update(['is_active' => false]);
            $student->user->update(['is_active' => false]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Student account deactivated.',
        ]);

        return redirect()->route('deans.students.index');
    }

    /**
     * @return array{student: Student, password: string}
     */
    private function createStudent(array $data): array
    {
        $internRoleId = Role::query()->where('name', 'intern')->valueOrFail('id');
        $password = Str::password(10);

        $user = User::query()->create([
            'name' => $this->fullName(
                $data['first_name'],
                $data['middle_name'] ?? null,
                $data['last_name'],
            ),
            'email' => $data['email'],
            'password' => $password,
            'role_id' => $internRoleId,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        $student = Student::query()->create([
            'user_id' => $user->id,
            'student_number' => $data['student_number'],
            'first_name' => $data['first_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'last_name' => $data['last_name'],
            'section_id' => $data['section_id'],
            'is_active' => true,
        ]);

        return [
            'student' => $student,
            'password' => $password,
        ];
    }

    private function fullName(string $firstName, ?string $middleName, string $lastName): string
    {
        return trim(collect([$firstName, $middleName, $lastName])->filter()->implode(' '));
    }

    private function generatedBulkEmail(string $studentNumber): string
    {
        $local = Str::lower((string) preg_replace('/[^a-zA-Z0-9.-]/', '', $studentNumber));

        return "{$local}@students.occ.edu.ph";
    }

    /**
     * @return array{0: int, 1: bool}
     */
    private function resolveOrCreateSectionId(
        Request $request,
        Course $course,
        ?int $sectionId,
        ?string $sectionLabel,
    ): array {
        if ($sectionId !== null) {
            $section = Section::query()->find($sectionId);

            abort_unless(
                $section !== null
                    && DeanPortalScope::sectionBelongsToScope($request->user(), $section),
                422,
                'One or more rows use a section outside your scope.',
            );

            return [$sectionId, false];
        }

        abort_if(blank($sectionLabel), 422, 'Each imported student must have a section.');

        $sectionName = $this->normalizeSectionNameFromLabel($sectionLabel, $course->code);

        $existingSection = $this->deanSectionsQuery($request)
            ->where('name', $sectionName)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_active', true))
            ->first();

        if ($existingSection !== null) {
            return [$existingSection->id, false];
        }

        $schoolYear = SchoolYear::query()->where('is_active', true)->first();

        abort_if(
            $schoolYear === null,
            422,
            'No active school year found. Set an active school year before importing students.',
        );

        $majorId = $this->resolveSectionMajorId($request, null)
            ?? $this->inferMajorIdFromSectionName($course, $sectionName);

        $section = Section::query()->create([
            'course_id' => $course->id,
            'course_major_id' => $majorId,
            'school_year_id' => $schoolYear->id,
            'name' => $sectionName,
            'is_active' => true,
        ]);

        return [$section->id, true];
    }

    private function normalizeSectionNameFromLabel(string $label, string $courseCode): string
    {
        $trimmed = trim($label);
        $coursePrefix = $courseCode.' ';

        if (str_starts_with(strtolower($trimmed), strtolower($coursePrefix))) {
            return trim(substr($trimmed, strlen($coursePrefix)));
        }

        return $trimmed;
    }

    private function inferMajorIdFromSectionName(Course $course, string $sectionName): ?int
    {
        if (! preg_match('/-([A-Za-z]+)$/', $sectionName, $matches)) {
            return null;
        }

        $majorCode = strtoupper($matches[1]);

        return CourseMajor::query()
            ->where('course_id', $course->id)
            ->where('code', $majorCode)
            ->value('id');
    }

    private function sendStudentCredentials(Student $student): void
    {
        $student->loadMissing('user');

        $password = Str::password(10);

        $student->user->update([
            'password' => $password,
        ]);

        Mail::to($student->user->email)->send(
            new StudentAccountCredentialsMail(
                student: $student,
                plainPassword: $password,
                loginUrl: route('login'),
            ),
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
}
