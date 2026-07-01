<?php

namespace App\Http\Controllers\Dean;

use App\Http\Controllers\Concerns\ResolvesDeanPortalPresentation;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Dean\Concerns\ResolvesDeanScope;
use App\Http\Requests\Dean\BulkStoreStudentRequest;
use App\Http\Requests\Dean\StoreStudentRequest;
use App\Models\Company;
use App\Models\Course;
use App\Models\Section;
use App\Models\Student;
use App\Models\Supervisor;
use App\Support\DeanPortalScope;
use App\Support\StudentAccountService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

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
