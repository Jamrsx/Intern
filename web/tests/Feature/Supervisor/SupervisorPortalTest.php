<?php

use App\Models\Company;
use App\Models\Course;
use App\Models\Department;
use App\Models\Role;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\Supervisor;
use App\Models\TimeLog;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;

function createSupervisorWithIntern(): array
{
    $internRoleId = Role::query()->where('name', 'intern')->value('id');
    $supervisorRoleId = Role::query()->where('name', 'supervisor')->value('id');
    $schoolYear = SchoolYear::query()->where('name', '2025-2026')->firstOrFail();

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

    $section = Section::query()->create([
        'course_id' => $course->id,
        'school_year_id' => $schoolYear->id,
        'name' => '4A',
        'is_active' => true,
    ]);

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
        'role_id' => $supervisorRoleId,
        'name' => 'Maria Supervisor',
    ]);

    $supervisor = Supervisor::query()->create([
        'user_id' => $supervisorUser->id,
        'company_id' => $company->id,
        'department_id' => $department->id,
        'position_title' => 'HR Supervisor',
        'is_active' => true,
    ]);

    $internUser = User::factory()->create([
        'role_id' => $internRoleId,
    ]);

    $student = Student::query()->create([
        'user_id' => $internUser->id,
        'student_number' => '2022-1-04311',
        'first_name' => 'John',
        'middle_name' => 'Michael',
        'last_name' => 'Doe',
        'section_id' => $section->id,
        'company_id' => $company->id,
        'department_id' => $department->id,
        'supervisor_id' => $supervisor->id,
        'is_active' => true,
    ]);

    return compact('supervisorUser', 'supervisor', 'student', 'course', 'company', 'department');
}

it('redirects supervisors to the supervisor dashboard after login', function () {
    $this->seed(RoleSeeder::class);

    $supervisorUser = User::factory()->create([
        'role_id' => Role::query()->where('name', 'supervisor')->value('id'),
    ]);

    $this->actingAs($supervisorUser)
        ->get(route('dashboard'))
        ->assertRedirect(route('supervisors.dashboard'));
});

it('shows assigned interns and total rendered hours for supervisors', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    [
        'supervisorUser' => $supervisorUser,
        'supervisor' => $supervisor,
        'student' => $student,
        'course' => $course,
        'company' => $company,
    ] = createSupervisorWithIntern();

    TimeLog::query()->create([
        'student_id' => $student->id,
        'time_in' => now()->subDays(2)->setTime(8, 0),
        'time_out' => now()->subDays(2)->setTime(17, 0),
        'duration_minutes' => 480,
    ]);

    TimeLog::query()->create([
        'student_id' => $student->id,
        'time_in' => now()->subDay()->setTime(8, 0),
        'time_out' => now()->subDay()->setTime(12, 0),
        'duration_minutes' => 240,
    ]);

    $this->actingAs($supervisorUser)
        ->get(route('supervisors.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('supervisor/dashboard')
            ->where('supervisor.id', $supervisor->id)
            ->where('supervisor.company.name', $company->name)
            ->where('stats.interns', 1)
            ->where('stats.total_rendered_hours', 12)
            ->has('interns', 1)
            ->where('interns.0.id', $student->id)
            ->where('interns.0.progress.required_hours', $course->required_hours)
            ->where('interns.0.progress.rendered_hours', 12)
            ->where('interns.0.progress.time_log_count', 2));
});

it('only shows interns assigned to the logged-in supervisor', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    [
        'supervisorUser' => $supervisorUser,
        'supervisor' => $supervisor,
        'student' => $assignedStudent,
        'company' => $company,
        'department' => $department,
        'course' => $course,
    ] = createSupervisorWithIntern();

    $otherSupervisorUser = User::factory()->create([
        'role_id' => Role::query()->where('name', 'supervisor')->value('id'),
    ]);

    $otherSupervisor = Supervisor::query()->create([
        'user_id' => $otherSupervisorUser->id,
        'company_id' => $company->id,
        'department_id' => $department->id,
        'is_active' => true,
    ]);

    $otherInternUser = User::factory()->create([
        'role_id' => Role::query()->where('name', 'intern')->value('id'),
    ]);

    Student::query()->create([
        'user_id' => $otherInternUser->id,
        'student_number' => '2022-1-09999',
        'first_name' => 'Jane',
        'last_name' => 'Smith',
        'section_id' => $assignedStudent->section_id,
        'company_id' => $company->id,
        'department_id' => $department->id,
        'supervisor_id' => $otherSupervisor->id,
        'is_active' => true,
    ]);

    $this->actingAs($supervisorUser)
        ->get(route('supervisors.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('stats.interns', 1)
            ->where('interns.0.id', $assignedStudent->id));
});

it('blocks non-supervisors from supervisor routes', function () {
    $this->seed(RoleSeeder::class);

    $dean = User::factory()->create([
        'role_id' => Role::query()->where('name', 'dean')->value('id'),
    ]);

    $this->actingAs($dean)
        ->get(route('supervisors.dashboard'))
        ->assertForbidden();
});
