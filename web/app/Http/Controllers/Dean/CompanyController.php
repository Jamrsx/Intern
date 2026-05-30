<?php

namespace App\Http\Controllers\Dean;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Dean\Concerns\ResolvesDeanCourse;
use App\Http\Requests\Dean\StoreCompanyRequest;
use App\Http\Requests\Dean\StoreDepartmentRequest;
use App\Http\Requests\Dean\UpdateCompanyRequest;
use App\Http\Requests\Dean\UpdateDepartmentRequest;
use App\Models\Company;
use App\Models\Department;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CompanyController extends Controller
{
    use ResolvesDeanCourse;

    public function index(Request $request): Response
    {
        $course = $this->deanCourseOrFail($request);

        $companies = Company::query()
            ->where('course_id', $course->id)
            ->with([
                'departments' => fn ($query) => $query
                    ->withCount([
                        'students as students_count' => fn ($studentQuery) => $studentQuery
                            ->where('is_active', true)
                            ->whereHas('section', fn ($sectionQuery) => $sectionQuery->where('course_id', $course->id)),
                    ])
                    ->orderBy('name'),
            ])
            ->withCount([
                'departments',
                'supervisors',
                'students as students_count' => fn ($query) => $query
                    ->where('is_active', true)
                    ->whereHas('section', fn ($sectionQuery) => $sectionQuery->where('course_id', $course->id)),
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

        return Inertia::render('deans/companies', [
            'companies' => $companies,
        ]);
    }

    public function store(StoreCompanyRequest $request): RedirectResponse
    {
        $course = $this->deanCourseOrFail($request);

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

        return redirect()->route('deans.companies.index');
    }

    public function update(UpdateCompanyRequest $request, Company $company): RedirectResponse
    {
        $course = $this->deanCourseOrFail($request);
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

        return redirect()->route('deans.companies.index');
    }

    public function destroy(Request $request, Company $company): RedirectResponse
    {
        $course = $this->deanCourseOrFail($request);
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

            return redirect()->route('deans.companies.index');
        }

        DB::transaction(function () use ($company): void {
            $company->update(['is_active' => false]);
            $company->departments()->update(['is_active' => false]);
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Company deactivated.',
        ]);

        return redirect()->route('deans.companies.index');
    }

    public function storeDepartment(
        StoreDepartmentRequest $request,
        Company $company,
    ): RedirectResponse {
        $course = $this->deanCourseOrFail($request);
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

        return redirect()->route('deans.companies.index');
    }

    public function updateDepartment(
        UpdateDepartmentRequest $request,
        Company $company,
        Department $department,
    ): RedirectResponse {
        $course = $this->deanCourseOrFail($request);
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

        return redirect()->route('deans.companies.index');
    }

    public function destroyDepartment(
        Request $request,
        Company $company,
        Department $department,
    ): RedirectResponse {
        $course = $this->deanCourseOrFail($request);
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

            return redirect()->route('deans.companies.index');
        }

        $department->update(['is_active' => false]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Department deactivated.',
        ]);

        return redirect()->route('deans.companies.index');
    }
}
