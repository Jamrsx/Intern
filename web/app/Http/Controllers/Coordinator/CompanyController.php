<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Coordinator\Concerns\ResolvesCoordinatorCourse;
use App\Http\Requests\Coordinator\StoreCompanyRequest;
use App\Http\Requests\Coordinator\StoreDepartmentRequest;
use App\Http\Requests\Coordinator\UpdateCompanyRequest;
use App\Http\Requests\Coordinator\UpdateDepartmentRequest;
use App\Models\Company;
use App\Models\Course;
use App\Models\Department;
use App\Models\Section;
use App\Models\Student;
use App\Models\Supervisor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CompanyController extends Controller
{
    use ResolvesCoordinatorCourse;

    public function index(Request $request): Response
    {
        $section = $this->coordinatorSection($request);

        if ($section === null) {
            return Inertia::render('coordinator/companies', [
                'section' => null,
                'companies' => [],
                'deactivated_count' => 0,
            ]);
        }

        $course = $section->course;

        $deactivatedCount = Company::query()
            ->where('course_id', $course->id)
            ->where('is_active', false)
            ->count();

        return Inertia::render('coordinator/companies', [
            'section' => $this->coordinatorSectionPayload($section),
            'companies' => $this->companyList($section, $course, activeOnly: true),
            'deactivated_count' => $deactivatedCount,
        ]);
    }

    public function deactivated(Request $request): Response
    {
        $section = $this->coordinatorSection($request);

        if ($section === null) {
            return Inertia::render('coordinator/companies/deactivated', [
                'section' => null,
                'companies' => [],
            ]);
        }

        $course = $section->course;

        return Inertia::render('coordinator/companies/deactivated', [
            'section' => $this->coordinatorSectionPayload($section),
            'companies' => $this->companyList($section, $course, activeOnly: false),
        ]);
    }

    public function create(Request $request): Response
    {
        $this->coordinatorSectionOrFail($request);

        return Inertia::render('coordinator/companies/create');
    }

    public function edit(Request $request, Company $company): Response
    {
        $section = $this->coordinatorSectionOrFail($request);
        $course = $section->course;
        $this->ensureCompanyBelongsToCourse($company, $course);

        $company->load([
            'departments' => fn ($query) => $query
                ->withCount([
                    'students as students_count' => fn ($studentQuery) => $studentQuery
                        ->where('is_active', true)
                        ->where('section_id', $section->id),
                ])
                ->orderBy('name'),
        ]);

        return Inertia::render('coordinator/companies/edit', [
            'company' => $this->companyPayload($company, $section),
        ]);
    }

    public function store(StoreCompanyRequest $request): RedirectResponse
    {
        $course = $this->coordinatorCourseOrFail($request);

        DB::transaction(function () use ($request, $course): void {
            $company = Company::query()->create([
                'course_id' => $course->id,
                'name' => $request->validated('name'),
                'address' => $request->validated('address'),
                'latitude' => $request->validated('latitude'),
                'longitude' => $request->validated('longitude'),
                'geofence_radius_meters' => $request->validated('geofence_radius_meters'),
                'geofence_enabled' => $request->boolean('geofence_enabled', true),
                'is_active' => true,
            ]);

            foreach ($request->validated('departments') as $departmentData) {
                $company->departments()->create([
                    'name' => $departmentData['name'],
                    'is_active' => true,
                ]);
            }
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Company created successfully.',
        ]);

        return redirect()->route('coordinators.companies.index');
    }

    public function update(UpdateCompanyRequest $request, Company $company): RedirectResponse
    {
        $course = $this->coordinatorCourseOrFail($request);
        $this->ensureCompanyBelongsToCourse($company, $course);

        $company->update([
            'name' => $request->validated('name'),
            'address' => $request->validated('address'),
            'latitude' => $request->validated('latitude'),
            'longitude' => $request->validated('longitude'),
            'geofence_radius_meters' => $request->validated('geofence_radius_meters'),
            'geofence_enabled' => $request->boolean('geofence_enabled', $company->geofence_enabled),
            'is_active' => $request->boolean('is_active', $company->is_active),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Company updated successfully.',
        ]);

        return redirect()->route('coordinators.companies.index');
    }

    public function destroy(Request $request, Company $company): RedirectResponse
    {
        $course = $this->coordinatorCourseOrFail($request);
        $this->ensureCompanyBelongsToCourse($company, $course);

        if (
            Student::query()
                ->where('company_id', $company->id)
                ->where('is_active', true)
                ->whereHas('section', fn ($query) => $query->where('course_id', $course->id))
                ->exists()
        ) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Cannot deactivate a company that has active students assigned.',
            ]);

            return redirect()->route('coordinators.companies.index');
        }

        DB::transaction(function () use ($company): void {
            $company->update(['is_active' => false]);
            $company->departments()->update(['is_active' => false]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Company deactivated.',
        ]);

        return redirect()->route('coordinators.companies.index');
    }

    public function reactivate(Request $request, Company $company): RedirectResponse
    {
        $course = $this->coordinatorCourseOrFail($request);
        $this->ensureCompanyBelongsToCourse($company, $course);
        abort_unless(! $company->is_active, 422, 'This company is already active.');

        DB::transaction(function () use ($company): void {
            $company->update(['is_active' => true]);
            $company->departments()->update(['is_active' => true]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "{$company->name} has been reactivated.",
        ]);

        return redirect()->route('coordinators.companies.deactivated');
    }

    public function storeDepartment(
        StoreDepartmentRequest $request,
        Company $company,
    ): RedirectResponse {
        $course = $this->coordinatorCourseOrFail($request);
        $this->ensureCompanyBelongsToCourse($company, $course);
        abort_unless($company->is_active, 404);

        $company->departments()->create([
            'name' => $request->validated('name'),
            'is_active' => true,
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Department added successfully.',
        ]);

        return redirect()->route('coordinators.companies.index');
    }

    public function updateDepartment(
        UpdateDepartmentRequest $request,
        Company $company,
        Department $department,
    ): RedirectResponse {
        $course = $this->coordinatorCourseOrFail($request);
        $this->ensureCompanyBelongsToCourse($company, $course);
        abort_unless($department->company_id === $company->id, 404);

        $department->update([
            'name' => $request->validated('name'),
            'is_active' => $request->boolean('is_active', $department->is_active),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Department updated successfully.',
        ]);

        return redirect()->route('coordinators.companies.index');
    }

    public function destroyDepartment(
        Request $request,
        Company $company,
        Department $department,
    ): RedirectResponse {
        $course = $this->coordinatorCourseOrFail($request);
        $this->ensureCompanyBelongsToCourse($company, $course);
        abort_unless($department->company_id === $company->id, 404);

        if (
            Student::query()
                ->where('department_id', $department->id)
                ->where('is_active', true)
                ->whereHas('section', fn ($query) => $query->where('course_id', $course->id))
                ->exists()
        ) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Cannot deactivate a department that has active students assigned.',
            ]);

            return redirect()->route('coordinators.companies.index');
        }

        $department->update(['is_active' => false]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Department deactivated.',
        ]);

        return redirect()->route('coordinators.companies.index');
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function companyList(Section $section, Course $course, bool $activeOnly): array
    {
        return Company::query()
            ->where('course_id', $course->id)
            ->where('is_active', $activeOnly)
            ->with([
                'departments' => fn ($query) => $query
                    ->with([
                        'activeSupervisors.user:id,name,email,is_active',
                    ])
                    ->withCount([
                        'students as students_count' => fn ($studentQuery) => $studentQuery
                            ->where('is_active', true)
                            ->where('section_id', $section->id),
                    ])
                    ->orderBy('name'),
            ])
            ->withCount([
                'departments',
                'supervisors',
                'students as students_count' => fn ($query) => $query
                    ->where('is_active', true)
                    ->where('section_id', $section->id),
            ])
            ->orderBy('name')
            ->get()
            ->map(fn (Company $company) => $this->companyPayload($company, $section))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function companyPayload(Company $company, ?Section $section = null): array
    {
        if ($section !== null && ! $company->relationLoaded('departments')) {
            $company->load([
                'departments' => fn ($query) => $query
                    ->with([
                        'activeSupervisors.user:id,name,email,is_active',
                    ])
                    ->withCount([
                        'students as students_count' => fn ($studentQuery) => $studentQuery
                            ->where('is_active', true)
                            ->where('section_id', $section->id),
                    ])
                    ->orderBy('name'),
            ]);
        }

        return [
            'id' => $company->id,
            'name' => $company->name,
            'address' => $company->address,
            'latitude' => $company->latitude,
            'longitude' => $company->longitude,
            'geofence_radius_meters' => $company->geofence_radius_meters,
            'geofence_enabled' => $company->geofence_enabled,
            'contact_person' => $company->contact_person,
            'contact_email' => $company->contact_email,
            'contact_phone' => $company->contact_phone,
            'is_active' => $company->is_active,
            'departments_count' => $company->departments_count ?? $company->departments()->count(),
            'supervisors_count' => $company->supervisors_count ?? $company->supervisors()->count(),
            'students_count' => $company->students_count ?? 0,
            'departments' => $company->departments?->map(
                fn (Department $department) => $this->departmentPayload($department),
            )->values()->all() ?? [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function departmentPayload(Department $department): array
    {
        $headSupervisor = $this->resolveDepartmentHeadSupervisor($department);
        $headUser = $headSupervisor?->user;

        return [
            'id' => $department->id,
            'name' => $department->name,
            'is_active' => $department->is_active,
            'students_count' => $department->students_count ?? 0,
            'head' => $headSupervisor !== null
                && $headUser !== null
                && $headUser->is_active
                ? [
                    'id' => $headSupervisor->id,
                    'name' => $headUser->name,
                    'email' => $headUser->email,
                    'position_title' => $headSupervisor->position_title,
                    'is_explicit_head' => $headSupervisor->is_department_head,
                ]
                : null,
        ];
    }

    private function resolveDepartmentHeadSupervisor(Department $department): ?Supervisor
    {
        if (! $department->relationLoaded('activeSupervisors')) {
            $department->load([
                'activeSupervisors' => fn ($query) => $query
                    ->where('is_active', true)
                    ->whereHas('user', fn ($userQuery) => $userQuery->where('is_active', true))
                    ->with('user:id,name,email,is_active')
                    ->orderByDesc('is_department_head')
                    ->orderBy('id'),
            ]);
        }

        return $department->activeSupervisors->first(
            fn (Supervisor $supervisor) => $supervisor->user?->is_active,
        );
    }
}
