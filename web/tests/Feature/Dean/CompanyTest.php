<?php

use App\Models\Company;
use App\Models\Course;
use App\Models\Department;
use App\Models\Role;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;

it('allows a dean to manage companies and departments', function () {
    $this->seed(RoleSeeder::class);

    $dean = User::factory()->create([
        'role_id' => Role::query()->where('name', 'dean')->value('id'),
    ]);

    $course = Course::query()->create([
        'code' => 'BSIT',
        'name' => 'Bachelor of Science in Information Technology',
        'required_hours' => 486,
        'dean_user_id' => $dean->id,
        'is_active' => true,
    ]);

    $this->actingAs($dean)
        ->post(route('deans.companies.store'), [
            'name' => 'Opol LGU',
            'address' => 'Opol, Misamis Oriental',
            'departments' => [
                ['name' => 'HR'],
                ['name' => 'Finance'],
            ],
        ])
        ->assertRedirect(route('deans.companies.index'));

    $company = Company::query()->where('name', 'Opol LGU')->first();

    expect($company)->not->toBeNull();
    expect($company?->course_id)->toBe($course->id);
    expect($company?->address)->toBe('Opol, Misamis Oriental');
    expect($company?->departments()->pluck('name')->all())->toBe(['Finance', 'HR']);

    $department = Department::query()
        ->where('company_id', $company?->id)
        ->where('name', 'HR')
        ->firstOrFail();

    $this->actingAs($dean)
        ->patch(route('deans.companies.update', $company), [
            'name' => 'Opol LGU Office',
            'address' => 'Updated address',
            'is_active' => '1',
        ])
        ->assertRedirect(route('deans.companies.index'));

    $this->actingAs($dean)
        ->post(route('deans.companies.departments.store', $company), [
            'name' => 'Planning',
        ])
        ->assertRedirect(route('deans.companies.index'));

    $this->actingAs($dean)
        ->patch(route('deans.companies.departments.update', [$company, $department]), [
            'name' => 'Human Resources',
            'is_active' => '1',
        ])
        ->assertRedirect(route('deans.companies.index'));

    expect($department->fresh()?->name)->toBe('Human Resources');

    $this->actingAs($dean)
        ->delete(route('deans.companies.departments.destroy', [$company, $department]))
        ->assertRedirect(route('deans.companies.index'));

    expect($department->fresh()?->is_active)->toBeFalse();
});

it('scopes companies to the logged-in dean course', function () {
    $this->seed(RoleSeeder::class);

    $bsitDean = User::factory()->create([
        'role_id' => Role::query()->where('name', 'dean')->value('id'),
        'email' => 'bsit.dean@gmail.com',
    ]);

    $educDean = User::factory()->create([
        'role_id' => Role::query()->where('name', 'dean')->value('id'),
        'email' => 'educ.dean@gmail.com',
    ]);

    $bsitCourse = Course::query()->create([
        'code' => 'BSIT',
        'name' => 'Bachelor of Science in Information Technology',
        'required_hours' => 486,
        'dean_user_id' => $bsitDean->id,
        'is_active' => true,
    ]);

    $educCourse = Course::query()->create([
        'code' => 'BEED',
        'name' => 'Bachelor of Elementary Education',
        'required_hours' => 486,
        'dean_user_id' => $educDean->id,
        'is_active' => true,
    ]);

    $bsitCompany = Company::query()->create([
        'course_id' => $bsitCourse->id,
        'name' => 'BSIT Partner Company',
        'address' => 'Cagayan de Oro',
        'is_active' => true,
    ]);

    $bsitCompany->departments()->create([
        'name' => 'IT',
        'is_active' => true,
    ]);

    Company::query()->create([
        'course_id' => $educCourse->id,
        'name' => 'EDUC Partner Company',
        'address' => 'Opol',
        'is_active' => true,
    ]);

    $this->actingAs($educDean)
        ->get(route('deans.companies.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('deans/companies')
            ->has('companies', 1)
            ->where('companies.0.name', 'EDUC Partner Company')
            ->missing('companies.1'));

    $this->actingAs($educDean)
        ->patch(route('deans.companies.update', $bsitCompany), [
            'name' => 'Hacked Company',
            'address' => 'Should not work',
            'is_active' => '1',
        ])
        ->assertForbidden();
});

it('allows a dean to view and reactivate deactivated companies', function () {
    $this->seed(RoleSeeder::class);

    $dean = User::factory()->create([
        'role_id' => Role::query()->where('name', 'dean')->value('id'),
    ]);

    $course = Course::query()->create([
        'code' => 'BSIT',
        'name' => 'Bachelor of Science in Information Technology',
        'required_hours' => 486,
        'dean_user_id' => $dean->id,
        'is_active' => true,
    ]);

    $company = Company::query()->create([
        'course_id' => $course->id,
        'name' => 'Inactive Partner',
        'address' => 'Sample address',
        'is_active' => false,
    ]);

    $department = $company->departments()->create([
        'name' => 'Operations',
        'is_active' => false,
    ]);

    $this->actingAs($dean)
        ->get(route('deans.companies.deactivated'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('deans/companies/deactivated')
            ->has('companies', 1)
            ->where('companies.0.name', 'Inactive Partner'));

    $this->actingAs($dean)
        ->patch(route('deans.companies.reactivate', $company))
        ->assertRedirect(route('deans.companies.deactivated'));

    expect($company->fresh()?->is_active)->toBeTrue();
    expect($department->fresh()?->is_active)->toBeTrue();
});

it('blocks deactivating a company with active students', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    $deanRoleId = Role::query()->where('name', 'dean')->value('id');
    $internRoleId = Role::query()->where('name', 'intern')->value('id');
    $schoolYear = SchoolYear::query()->where('name', '2025-2026')->firstOrFail();

    $dean = User::factory()->create([
        'role_id' => $deanRoleId,
    ]);

    $course = Course::query()->create([
        'code' => 'BSIT',
        'name' => 'Bachelor of Science in Information Technology',
        'required_hours' => 486,
        'dean_user_id' => $dean->id,
        'is_active' => true,
    ]);

    $section = Section::query()->create([
        'course_id' => $course->id,
        'school_year_id' => $schoolYear->id,
        'name' => '4A',
        'is_active' => true,
    ]);

    $company = Company::query()->create([
        'course_id' => $course->id,
        'name' => 'Assigned Company',
        'address' => 'Sample address',
        'is_active' => true,
    ]);

    $intern = User::factory()->create([
        'role_id' => $internRoleId,
        'is_active' => true,
    ]);

    Student::query()->create([
        'user_id' => $intern->id,
        'student_number' => '2022-1-09999',
        'first_name' => 'Test',
        'middle_name' => null,
        'last_name' => 'Intern',
        'section_id' => $section->id,
        'company_id' => $company->id,
        'is_active' => true,
    ]);

    $this->actingAs($dean)
        ->delete(route('deans.companies.destroy', $company))
        ->assertRedirect(route('deans.companies.index'));

    expect($company->fresh()?->is_active)->toBeTrue();
});
