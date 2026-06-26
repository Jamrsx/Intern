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

it('allows a coordinator to manage companies and departments', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'section' => $section, 'course' => $course] = createCoordinatorWithSection();

    $this->actingAs($coordinator)
        ->get(route('coordinators.companies.create'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page->component('coordinator/companies/create'));

    $this->actingAs($coordinator)
        ->post(route('coordinators.companies.store'), [
            'name' => 'Opol LGU',
            'address' => 'Opol, Misamis Oriental',
            'latitude' => 8.4542,
            'longitude' => 124.6319,
            'geofence_radius_meters' => 10,
            'geofence_enabled' => true,
            'departments' => [
                ['name' => 'HR'],
                ['name' => 'Finance'],
            ],
        ])
        ->assertRedirect(route('coordinators.companies.index'));

    $company = Company::query()->where('name', 'Opol LGU')->first();

    expect($company)->not->toBeNull();
    expect($company?->course_id)->toBe($course->id);
    expect($company?->address)->toBe('Opol, Misamis Oriental');
    expect((float) $company?->latitude)->toBe(8.4542);
    expect((float) $company?->longitude)->toBe(124.6319);
    expect($company?->geofence_radius_meters)->toBe(10);
    expect($company?->geofence_enabled)->toBeTrue();
    expect($company?->departments()->pluck('name')->all())->toBe(['Finance', 'HR']);

    $department = Department::query()
        ->where('company_id', $company?->id)
        ->where('name', 'HR')
        ->firstOrFail();

    $this->actingAs($coordinator)
        ->get(route('coordinators.companies.edit', $company))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('coordinator/companies/edit')
            ->where('company.name', 'Opol LGU'));

    $this->actingAs($coordinator)
        ->patch(route('coordinators.companies.update', $company), [
            'name' => 'Opol LGU Office',
            'address' => 'Updated address',
            'latitude' => 8.46,
            'longitude' => 124.64,
            'geofence_radius_meters' => 1500,
            'geofence_enabled' => true,
            'is_active' => '1',
        ])
        ->assertRedirect(route('coordinators.companies.index'));

    $this->actingAs($coordinator)
        ->post(route('coordinators.companies.departments.store', $company), [
            'name' => 'Planning',
        ])
        ->assertRedirect(route('coordinators.companies.index'));

    $this->actingAs($coordinator)
        ->patch(route('coordinators.companies.departments.update', [$company, $department]), [
            'name' => 'Human Resources',
            'is_active' => '1',
        ])
        ->assertRedirect(route('coordinators.companies.index'));

    expect($department->fresh()?->name)->toBe('Human Resources');

    $this->actingAs($coordinator)
        ->delete(route('coordinators.companies.departments.destroy', [$company, $department]))
        ->assertRedirect(route('coordinators.companies.index'));

    expect($department->fresh()?->is_active)->toBeFalse();
});

it('shows the assigned department head on the companies page', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'course' => $course] = createCoordinatorWithSection();

    $company = Company::query()->create([
        'course_id' => $course->id,
        'name' => 'Opol LGU',
        'is_active' => true,
    ]);

    $department = Department::query()->create([
        'company_id' => $company->id,
        'name' => 'HR',
        'is_active' => true,
    ]);

    $this->actingAs($coordinator)
        ->post(route('coordinators.supervisors.store'), [
            'name' => 'Maria Santos',
            'email' => 'maria.santos@gmail.com',
            'company_id' => $company->id,
            'department_id' => $department->id,
            'position_title' => 'HR Manager',
            'is_department_head' => '1',
            'password' => 'password',
        ])
        ->assertRedirect(route('coordinators.supervisors.index'));

    $this->actingAs($coordinator)
        ->get(route('coordinators.companies.index'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('coordinator/companies')
            ->where('companies.0.departments.0.name', 'HR')
            ->where('companies.0.departments.0.head.name', 'Maria Santos')
            ->where('companies.0.departments.0.head.position_title', 'HR Manager'));
});

it('shows an assigned supervisor as department head even without the explicit head flag', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'course' => $course] = createCoordinatorWithSection();

    $company = Company::query()->create([
        'course_id' => $course->id,
        'name' => 'Opol LGU',
        'is_active' => true,
    ]);

    $department = Department::query()->create([
        'company_id' => $company->id,
        'name' => 'IT',
        'is_active' => true,
    ]);

    $this->actingAs($coordinator)
        ->post(route('coordinators.supervisors.store'), [
            'name' => 'IT Head',
            'email' => 'it.lgu@gmail.com',
            'company_id' => $company->id,
            'department_id' => $department->id,
            'position_title' => 'IT Supervisor',
            'password' => 'password',
        ])
        ->assertRedirect(route('coordinators.supervisors.index'));

    $this->actingAs($coordinator)
        ->get(route('coordinators.companies.index'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('coordinator/companies')
            ->where('companies.0.departments.0.name', 'IT')
            ->where('companies.0.departments.0.head.name', 'IT Head')
            ->where('companies.0.departments.0.head.position_title', 'IT Supervisor'));
});

it('shares companies across sections in the same course', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    $schoolYear = SchoolYear::query()->where('name', '2025-2026')->firstOrFail();
    $coordinatorRoleId = Role::query()->where('name', 'coordinator')->value('id');
    $deanRoleId = Role::query()->where('name', 'dean')->value('id');

    $bsit4aCoordinator = User::factory()->create([
        'role_id' => $coordinatorRoleId,
        'email' => 'bsit.4a.coordinator@gmail.com',
    ]);

    $bsit4bCoordinator = User::factory()->create([
        'role_id' => $coordinatorRoleId,
        'email' => 'bsit.4b.coordinator@gmail.com',
    ]);

    $educCoordinator = User::factory()->create([
        'role_id' => $coordinatorRoleId,
        'email' => 'educ.coordinator@gmail.com',
    ]);

    $bsitCourse = Course::query()->create([
        'code' => 'BSIT',
        'name' => 'Bachelor of Science in Information Technology',
        'required_hours' => 486,
        'dean_user_id' => User::factory()->create(['role_id' => $deanRoleId])->id,
        'is_active' => true,
    ]);

    $educCourse = Course::query()->create([
        'code' => 'BEED',
        'name' => 'Bachelor of Elementary Education',
        'required_hours' => 486,
        'dean_user_id' => User::factory()->create(['role_id' => $deanRoleId])->id,
        'is_active' => true,
    ]);

    Section::query()->create([
        'course_id' => $bsitCourse->id,
        'school_year_id' => $schoolYear->id,
        'name' => '4A',
        'coordinator_user_id' => $bsit4aCoordinator->id,
        'is_active' => true,
    ]);

    Section::query()->create([
        'course_id' => $bsitCourse->id,
        'school_year_id' => $schoolYear->id,
        'name' => '4B',
        'coordinator_user_id' => $bsit4bCoordinator->id,
        'is_active' => true,
    ]);

    Section::query()->create([
        'course_id' => $educCourse->id,
        'school_year_id' => $schoolYear->id,
        'name' => '4A',
        'coordinator_user_id' => $educCoordinator->id,
        'is_active' => true,
    ]);

    $sharedCompany = Company::query()->create([
        'course_id' => $bsitCourse->id,
        'name' => 'DPWH R1-Cdo First',
        'address' => 'Cagayan de Oro',
        'is_active' => true,
    ]);

    Company::query()->create([
        'course_id' => $educCourse->id,
        'name' => 'EDUC Partner Company',
        'address' => 'Opol',
        'is_active' => true,
    ]);

    $this->actingAs($bsit4aCoordinator)
        ->get(route('coordinators.companies.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coordinator/companies')
            ->has('companies', 1)
            ->where('companies.0.name', 'DPWH R1-Cdo First'));

    $this->actingAs($bsit4bCoordinator)
        ->get(route('coordinators.companies.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coordinator/companies')
            ->has('companies', 1)
            ->where('companies.0.name', 'DPWH R1-Cdo First'));

    $this->actingAs($educCoordinator)
        ->get(route('coordinators.companies.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coordinator/companies')
            ->has('companies', 1)
            ->where('companies.0.name', 'EDUC Partner Company'));

    $this->actingAs($educCoordinator)
        ->patch(route('coordinators.companies.update', $sharedCompany), [
            'name' => 'Hacked Company',
            'address' => 'Should not work',
            'is_active' => '1',
        ])
        ->assertForbidden();
});

it('allows a coordinator to view and reactivate deactivated companies', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'section' => $section, 'course' => $course] = createCoordinatorWithSection();

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

    $this->actingAs($coordinator)
        ->get(route('coordinators.companies.deactivated'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coordinator/companies/deactivated')
            ->has('companies', 1)
            ->where('companies.0.name', 'Inactive Partner'));

    $this->actingAs($coordinator)
        ->patch(route('coordinators.companies.reactivate', $company))
        ->assertRedirect(route('coordinators.companies.deactivated'));

    expect($company->fresh()?->is_active)->toBeTrue();
    expect($department->fresh()?->is_active)->toBeTrue();
});

it('blocks deactivating a company with active students', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'section' => $section, 'course' => $course] = createCoordinatorWithSection();

    $company = Company::query()->create([
        'course_id' => $course->id,
        'name' => 'Assigned Company',
        'address' => 'Sample address',
        'is_active' => true,
    ]);

    $internRoleId = Role::query()->where('name', 'intern')->value('id');

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

    $this->actingAs($coordinator)
        ->delete(route('coordinators.companies.destroy', $company))
        ->assertRedirect(route('coordinators.companies.index'));

    expect($company->fresh()?->is_active)->toBeTrue();
});

it('blocks deans from managing coordinator company routes', function () {
    $this->seed(RoleSeeder::class);

    $dean = User::factory()->create([
        'role_id' => Role::query()->where('name', 'dean')->value('id'),
    ]);

    Course::query()->create([
        'code' => 'BSIT',
        'name' => 'Bachelor of Science in Information Technology',
        'required_hours' => 486,
        'dean_user_id' => $dean->id,
        'is_active' => true,
    ]);

    $this->actingAs($dean)
        ->get(route('coordinators.companies.index'))
        ->assertForbidden();
});
