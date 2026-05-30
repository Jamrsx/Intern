<?php

namespace App\Http\Controllers\Dean;

use App\Http\Controllers\Controller;
use App\Http\Requests\Dean\BulkStoreStudentRequest;
use App\Http\Requests\Dean\StoreStudentRequest;
use App\Http\Requests\Dean\UpdateStudentRequest;
use App\Models\Company;
use App\Models\Course;
use App\Models\Role;
use App\Models\Section;
use App\Models\Student;
use App\Models\Supervisor;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class StudentController extends Controller
{
    public function index(Request $request): Response
    {
        $course = $this->deanCourse($request);

        $sections = $this->availableSections($course);
        $students = $this->studentList($course);
        $companies = $this->companyOptions();
        $supervisors = $this->supervisorOptions();

        return Inertia::render('deans/students', [
            'course' => $course ? [
                'id' => $course->id,
                'code' => $course->code,
                'name' => $course->name,
            ] : null,
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
        $this->deanCourseOrFail($request);
        $validated = $request->validated();
        $createdCount = 0;

        DB::transaction(function () use ($validated, &$createdCount) {
            foreach ($validated['students'] as $studentData) {
                $this->createStudent([
                    ...$studentData,
                    'email' => $studentData['email'] ?? $this->generatedBulkEmail($studentData['student_number']),
                    'section_id' => $studentData['section_id'] ?? $validated['section_id'],
                ]);

                $createdCount++;
            }
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "{$createdCount} student account(s) created. Default passwords were generated for each account.",
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

    public function destroy(Request $request, Student $student): RedirectResponse
    {
        $course = $this->deanCourseOrFail($request);
        abort_unless($student->section?->course_id === $course->id, 404);

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

    private function deanCourse(Request $request): ?Course
    {
        return Course::query()
            ->where('dean_user_id', $request->user()->id)
            ->first();
    }

    private function deanCourseOrFail(Request $request): Course
    {
        $course = $this->deanCourse($request);

        abort_if($course === null, 403, 'You are not assigned to a course yet.');

        return $course;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function availableSections(?Course $course): array
    {
        if ($course === null) {
            return [];
        }

        return Section::query()
            ->with('schoolYear:id,name,is_active')
            ->where('course_id', $course->id)
            ->where('is_active', true)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_active', true))
            ->orderBy('name')
            ->get()
            ->map(fn (Section $section) => [
                'id' => $section->id,
                'name' => $section->name,
                'display_name' => trim("{$course->code} {$section->name}"),
                'school_year' => $section->schoolYear?->name,
            ])
            ->values()
            ->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function studentList(?Course $course): array
    {
        if ($course === null) {
            return [];
        }

        return Student::query()
            ->with([
                'user:id,name,email,is_active',
                'section.schoolYear:id,name',
                'company:id,name',
                'department:id,name,company_id',
                'supervisor.user:id,name',
            ])
            ->whereHas('section', fn ($query) => $query->where('course_id', $course->id))
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
    private function companyOptions(): array
    {
        return Company::query()
            ->with(['departments' => fn ($query) => $query->where('is_active', true)->orderBy('name')])
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
    private function supervisorOptions(): array
    {
        return Supervisor::query()
            ->with('user:id,name')
            ->where('is_active', true)
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
