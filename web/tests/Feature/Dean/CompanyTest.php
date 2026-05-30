<?php

use App\Models\Company;
use App\Models\Department;
use App\Models\Role;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RoleSeeder;

it('allows a dean to manage companies and departments', function () {
    $this->seed(RoleSeeder::class);

    $dean = User::factory()->create([
        'role_id' => Role::query()->where('name', 'dean')->value('id'),
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

it('blocks deactivating a company with active students', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(\Database\Seeders\SchoolYearSeeder::class);

    $deanRoleId = Role::query()->where('name', 'dean')->value('id');
    $internRoleId = Role::query()->where('name', 'intern')->value('id');
    $schoolYear = \App\Models\SchoolYear::query()->where('name', '2025-2026')->firstOrFail();

    $dean = User::factory()->create([
        'role_id' => $deanRoleId,
    ]);

    $course = \App\Models\Course::query()->create([
        'code' => 'BSIT',
        'name' => 'Bachelor of Science in Information Technology',
        'required_hours' => 486,
        'dean_user_id' => $dean->id,
        'is_active' => true,
    ]);

    $section = \App\Models\Section::query()->create([
        'course_id' => $course->id,
        'school_year_id' => $schoolYear->id,
        'name' => '4A',
        'is_active' => true,
    ]);

    $company = Company::query()->create([
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
