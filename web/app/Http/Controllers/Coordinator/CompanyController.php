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
        $section = $this->coordinatorSectionOrFail($request);
        $course = $section->course;

        $deactivatedCount = Company::query()
            ->where('course_id', $course->id)
            ->where('is_active', false)
            ->count();

        return Inertia::render('coordinator/companies', [
            'companies' => $this->companyList($section, $course, activeOnly: true),
            'deactivated_count' => $deactivatedCount,
        ]);
    }

    public function deactivated(Request $request): Response
    {
        $section = $this->coordinatorSectionOrFail($request);
        $course = $section->course;

        return Inertia::render('coordinator/companies/deactivated', [
            'companies' => $this->companyList($section, $course, activeOnly: false),
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
            ->map(fn (Company $company) => [
                'id' => $company->id,
                'name' => $company->name,
                'address' => $company->address,
                'contact_person' => $company->contact_person,
                'contact_email' => $company->contact_email,
                'contact_phone' => $company->contact_phone,
                'is_active' => $company->is_active,
                'departments_count' => $company->departments_count,
                'supervisors_count' => $company->supervisors_count,
                'students_count' => $company->students_count,
                'departments' => $company->departments->map(fn (Department $department) => [
                    'id' => $department->id,
                    'name' => $department->name,
                    'is_active' => $department->is_active,
                    'students_count' => $department->students_count,
                ])->values()->all(),
            ])
            ->values()
            ->all();
    }
}
