<?php

use App\Models\Company;
use App\Models\Course;
use App\Models\Department;
use App\Models\OjtEvaluation;
use App\Models\Role;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\Supervisor;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;

function createSupervisorEvaluationContext(): array
{
    $internRoleId = Role::query()->where('name', 'intern')->value('id');
    $supervisorRoleId = Role::query()->where('name', 'supervisor')->value('id');
    $coordinatorRoleId = Role::query()->where('name', 'coordinator')->value('id');
    $schoolYear = SchoolYear::query()->where('name', '2025-2026')->firstOrFail();

    $course = Course::query()->create([
        'code' => 'BSIT',
        'name' => 'Bachelor of Science in Information Technology',
        'required_hours' => 486,
        'dean_user_id' => User::factory()->create([
            'role_id' => Role::query()->where('name', 'dean')->value('id'),
        ])->id,
        'is_active' => true,
    ]);

    $coordinator = User::factory()->create([
        'role_id' => $coordinatorRoleId,
    ]);

    $section = Section::query()->create([
        'course_id' => $course->id,
        'school_year_id' => $schoolYear->id,
        'name' => '4A',
        'coordinator_user_id' => $coordinator->id,
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

    return compact(
        'coordinator',
        'supervisorUser',
        'supervisor',
        'student',
        'section',
    );
}

it('allows a coordinator to open an evaluation for an assigned student', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    [
        'coordinator' => $coordinator,
        'supervisor' => $supervisor,
        'student' => $student,
    ] = createSupervisorEvaluationContext();

    $this->actingAs($coordinator)
        ->from(route('coordinators.students.show', $student))
        ->post(route('coordinators.students.evaluations.store', $student))
        ->assertRedirect(route('coordinators.students.show', $student));

    $evaluation = OjtEvaluation::query()->first();

    expect($evaluation)->not->toBeNull();
    expect($evaluation?->student_id)->toBe($student->id);
    expect($evaluation?->supervisor_id)->toBe($supervisor->id);
    expect($evaluation?->status)->toBe(OjtEvaluation::STATUS_PENDING);
    expect($evaluation?->opened_by_user_id)->toBe($coordinator->id);
});

it('shows evaluations on the coordinator student detail page', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    [
        'coordinator' => $coordinator,
        'supervisorUser' => $supervisorUser,
        'student' => $student,
    ] = createSupervisorEvaluationContext();

    OjtEvaluation::query()->create([
        'student_id' => $student->id,
        'supervisor_id' => $student->supervisor_id,
        'opened_by_user_id' => $coordinator->id,
        'status' => OjtEvaluation::STATUS_COMPLETED,
        'rating' => 4,
        'comments' => 'Strong performance.',
        'evaluation_date' => now()->toDateString(),
        'opened_at' => now()->subDay(),
        'submitted_at' => now(),
    ]);

    $this->actingAs($coordinator)
        ->get(route('coordinators.students.show', $student))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('evaluations', 1)
            ->where('evaluations.0.status', OjtEvaluation::STATUS_COMPLETED)
            ->where('evaluations.0.rating', 4)
            ->where('evaluations.0.comments', 'Strong performance.')
            ->where('can_open_evaluation', true));
});

it('blocks opening a duplicate pending evaluation', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    [
        'coordinator' => $coordinator,
        'student' => $student,
    ] = createSupervisorEvaluationContext();

    OjtEvaluation::query()->create([
        'student_id' => $student->id,
        'supervisor_id' => $student->supervisor_id,
        'opened_by_user_id' => $coordinator->id,
        'status' => OjtEvaluation::STATUS_PENDING,
        'opened_at' => now(),
    ]);

    $this->actingAs($coordinator)
        ->post(route('coordinators.students.evaluations.store', $student))
        ->assertStatus(422);

    expect(OjtEvaluation::query()->count())->toBe(1);
});

it('allows a supervisor to submit a pending evaluation', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    [
        'coordinator' => $coordinator,
        'supervisorUser' => $supervisorUser,
        'student' => $student,
    ] = createSupervisorEvaluationContext();

    $evaluation = OjtEvaluation::query()->create([
        'student_id' => $student->id,
        'supervisor_id' => $student->supervisor_id,
        'opened_by_user_id' => $coordinator->id,
        'status' => OjtEvaluation::STATUS_PENDING,
        'opened_at' => now(),
    ]);

    $this->actingAs($supervisorUser)
        ->patch(route('supervisors.evaluations.update', $evaluation), [
            'rating' => 5,
            'comments' => 'Excellent intern.',
            'evaluation_date' => now()->toDateString(),
        ])
        ->assertRedirect(route('supervisors.dashboard'));

    $evaluation->refresh();

    expect($evaluation->status)->toBe(OjtEvaluation::STATUS_COMPLETED);
    expect($evaluation->rating)->toBe(5);
    expect($evaluation->comments)->toBe('Excellent intern.');
    expect($evaluation->submitted_at)->not->toBeNull();
});

it('shows pending evaluations on the supervisor dashboard', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    [
        'coordinator' => $coordinator,
        'supervisorUser' => $supervisorUser,
        'student' => $student,
    ] = createSupervisorEvaluationContext();

    OjtEvaluation::query()->create([
        'student_id' => $student->id,
        'supervisor_id' => $student->supervisor_id,
        'opened_by_user_id' => $coordinator->id,
        'status' => OjtEvaluation::STATUS_PENDING,
        'opened_at' => now(),
    ]);

    $this->actingAs($supervisorUser)
        ->get(route('supervisors.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('stats.pending_evaluations', 1)
            ->where('interns.0.pending_evaluation.id', OjtEvaluation::query()->value('id')));
});

it('blocks supervisors from submitting another supervisors evaluation', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    [
        'coordinator' => $coordinator,
        'supervisorUser' => $supervisorUser,
        'student' => $student,
    ] = createSupervisorEvaluationContext();

    $otherSupervisorUser = User::factory()->create([
        'role_id' => Role::query()->where('name', 'supervisor')->value('id'),
    ]);

    $evaluation = OjtEvaluation::query()->create([
        'student_id' => $student->id,
        'supervisor_id' => $student->supervisor_id,
        'opened_by_user_id' => $coordinator->id,
        'status' => OjtEvaluation::STATUS_PENDING,
        'opened_at' => now(),
    ]);

    $this->actingAs($otherSupervisorUser)
        ->patch(route('supervisors.evaluations.update', $evaluation), [
            'rating' => 3,
            'comments' => 'Should not work.',
            'evaluation_date' => now()->toDateString(),
        ])
        ->assertForbidden();
});
