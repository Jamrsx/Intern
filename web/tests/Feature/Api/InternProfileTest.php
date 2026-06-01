<?php

use App\Models\Company;
use App\Models\Department;
use App\Models\Role;
use App\Models\Supervisor;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Passport\Passport;

uses(RefreshDatabase::class);

it('returns intern profile with placement details', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student, 'course' => $course] = createCoordinatorWithSection();

    $company = Company::query()->create([
        'course_id' => $course->id,
        'name' => 'Opol LGU',
        'address' => 'Opol, Misamis Oriental',
        'is_active' => true,
    ]);

    $department = Department::query()->create([
        'company_id' => $company->id,
        'name' => 'HR',
        'is_active' => true,
    ]);

    $supervisorUser = User::factory()->create([
        'role_id' => Role::query()->where('name', 'supervisor')->value('id'),
        'name' => 'Maria Supervisor',
        'email' => 'maria.supervisor@example.com',
    ]);

    $supervisor = Supervisor::query()->create([
        'user_id' => $supervisorUser->id,
        'company_id' => $company->id,
        'department_id' => $department->id,
        'position_title' => 'HR Supervisor',
        'is_active' => true,
    ]);

    $student->update([
        'company_id' => $company->id,
        'department_id' => $department->id,
        'supervisor_id' => $supervisor->id,
    ]);

    Passport::actingAs($student->user);

    $this->getJson('/api/intern/profile')
        ->assertSuccessful()
        ->assertJsonPath('student.student_number', $student->student_number)
        ->assertJsonPath('placement.company.name', 'Opol LGU')
        ->assertJsonPath('placement.department.name', 'HR')
        ->assertJsonPath('placement.supervisor.name', 'Maria Supervisor')
        ->assertJsonPath('placement.supervisor.position_title', 'HR Supervisor');
});

it('allows an intern to update their password', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    Passport::actingAs($student->user);

    $this->putJson('/api/intern/password', [
        'current_password' => 'password',
        'password' => 'NewPassword1!',
        'password_confirmation' => 'NewPassword1!',
    ])
        ->assertSuccessful()
        ->assertJsonPath('message', 'Password updated successfully.');

    expect(Hash::check('NewPassword1!', $student->user->refresh()->password))->toBeTrue();
});

it('rejects password update with wrong current password', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    Passport::actingAs($student->user);

    $this->putJson('/api/intern/password', [
        'current_password' => 'wrong-password',
        'password' => 'NewPassword1!',
        'password_confirmation' => 'NewPassword1!',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['current_password']);
});

it('forbids non-intern users from intern profile endpoints', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator] = createCoordinatorWithSection();

    Passport::actingAs($coordinator);

    $this->getJson('/api/intern/profile')->assertForbidden();
    $this->putJson('/api/intern/password', [
        'current_password' => 'password',
        'password' => 'NewPassword1!',
        'password_confirmation' => 'NewPassword1!',
    ])->assertForbidden();
});
