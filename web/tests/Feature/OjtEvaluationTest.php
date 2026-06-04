<?php

use App\Models\Company;
use App\Models\Course;
use App\Models\Department;
use App\Models\OjtEvaluation;
use App\Models\OjtEvaluationTemplate;
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

    $template = OjtEvaluationTemplate::query()->create([
        'section_id' => $section->id,
        'created_by_user_id' => $coordinator->id,
        'name' => 'Midterm Evaluation',
        'description' => 'Midterm performance review',
        'is_active' => true,
    ]);

    $ratingItem = $template->items()->create([
        'sort_order' => 0,
        'item_type' => 'rating_question',
        'label' => 'Quality of work',
        'is_required' => true,
    ]);

    $textItem = $template->items()->create([
        'sort_order' => 1,
        'item_type' => 'text_area',
        'label' => 'Strengths and weaknesses',
        'is_required' => true,
    ]);

    return compact(
        'coordinator',
        'supervisorUser',
        'supervisor',
        'student',
        'section',
        'template',
        'ratingItem',
        'textItem',
    );
}

it('allows a coordinator to open an evaluation for an assigned student', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    [
        'coordinator' => $coordinator,
        'supervisor' => $supervisor,
        'student' => $student,
        'template' => $template,
    ] = createSupervisorEvaluationContext();

    $this->actingAs($coordinator)
        ->from(route('coordinators.students.show', $student))
        ->post(route('coordinators.students.evaluations.store', $student), [
            'evaluation_template_id' => $template->id,
        ])
        ->assertRedirect(route('coordinators.students.show', $student));

    $evaluation = OjtEvaluation::query()->first();

    expect($evaluation)->not->toBeNull();
    expect($evaluation?->student_id)->toBe($student->id);
    expect($evaluation?->supervisor_id)->toBe($supervisor->id);
    expect($evaluation?->evaluation_template_id)->toBe($template->id);
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
        'template' => $template,
        'ratingItem' => $ratingItem,
        'textItem' => $textItem,
    ] = createSupervisorEvaluationContext();

    OjtEvaluation::query()->create([
        'student_id' => $student->id,
        'supervisor_id' => $student->supervisor_id,
        'opened_by_user_id' => $coordinator->id,
        'evaluation_template_id' => $template->id,
        'status' => OjtEvaluation::STATUS_COMPLETED,
        'rating' => 4,
        'comments' => 'Strengths and weaknesses: Strong performance.',
        'responses' => [
            [
                'item_id' => $ratingItem->id,
                'item_type' => 'rating_question',
                'label' => 'Quality of work',
                'rating' => 4,
            ],
            [
                'item_id' => $textItem->id,
                'item_type' => 'text_area',
                'label' => 'Strengths and weaknesses',
                'text' => 'Strong performance.',
            ],
        ],
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
            ->where('evaluations.0.template.name', 'Midterm Evaluation')
            ->where('can_open_evaluation', true));
});

it('blocks opening a duplicate pending evaluation', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    [
        'coordinator' => $coordinator,
        'student' => $student,
        'template' => $template,
    ] = createSupervisorEvaluationContext();

    OjtEvaluation::query()->create([
        'student_id' => $student->id,
        'supervisor_id' => $student->supervisor_id,
        'opened_by_user_id' => $coordinator->id,
        'evaluation_template_id' => $template->id,
        'status' => OjtEvaluation::STATUS_PENDING,
        'opened_at' => now(),
    ]);

    $this->actingAs($coordinator)
        ->post(route('coordinators.students.evaluations.store', $student), [
            'evaluation_template_id' => $template->id,
        ])
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
        'template' => $template,
        'ratingItem' => $ratingItem,
        'textItem' => $textItem,
    ] = createSupervisorEvaluationContext();

    $evaluation = OjtEvaluation::query()->create([
        'student_id' => $student->id,
        'supervisor_id' => $student->supervisor_id,
        'opened_by_user_id' => $coordinator->id,
        'evaluation_template_id' => $template->id,
        'status' => OjtEvaluation::STATUS_PENDING,
        'opened_at' => now(),
    ]);

    $this->actingAs($supervisorUser)
        ->patch(route('supervisors.evaluations.update', $evaluation), [
            'evaluation_date' => now()->toDateString(),
            'responses' => [
                [
                    'item_id' => $ratingItem->id,
                    'rating' => 5,
                ],
                [
                    'item_id' => $textItem->id,
                    'text' => 'Excellent intern.',
                ],
            ],
        ])
        ->assertRedirect(route('supervisors.dashboard'));

    $evaluation->refresh();

    expect($evaluation->status)->toBe(OjtEvaluation::STATUS_COMPLETED);
    expect($evaluation->rating)->toBe(5);
    expect($evaluation->comments)->toContain('Excellent intern.');
    expect($evaluation->responses)->toHaveCount(2);
    expect($evaluation->submitted_at)->not->toBeNull();
});

it('shows pending evaluations on the supervisor dashboard', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    [
        'coordinator' => $coordinator,
        'supervisorUser' => $supervisorUser,
        'student' => $student,
        'template' => $template,
    ] = createSupervisorEvaluationContext();

    OjtEvaluation::query()->create([
        'student_id' => $student->id,
        'supervisor_id' => $student->supervisor_id,
        'opened_by_user_id' => $coordinator->id,
        'evaluation_template_id' => $template->id,
        'status' => OjtEvaluation::STATUS_PENDING,
        'opened_at' => now(),
    ]);

    $this->actingAs($supervisorUser)
        ->get(route('supervisors.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('stats.pending_evaluations', 1)
            ->where('interns.0.pending_evaluation.id', OjtEvaluation::query()->value('id'))
            ->where('interns.0.pending_evaluation.template.name', 'Midterm Evaluation'));
});

it('allows a coordinator to open evaluations for all eligible students', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    [
        'coordinator' => $coordinator,
        'student' => $student,
        'supervisor' => $supervisor,
        'template' => $template,
    ] = createSupervisorEvaluationContext();

    $secondInternUser = User::factory()->create([
        'role_id' => Role::query()->where('name', 'intern')->value('id'),
    ]);

    $secondStudent = Student::query()->create([
        'user_id' => $secondInternUser->id,
        'student_number' => '2022-1-04312',
        'first_name' => 'Jane',
        'last_name' => 'Smith',
        'section_id' => $student->section_id,
        'company_id' => $student->company_id,
        'department_id' => $student->department_id,
        'supervisor_id' => $supervisor->id,
        'is_active' => true,
    ]);

    Student::query()->create([
        'user_id' => User::factory()->create([
            'role_id' => Role::query()->where('name', 'intern')->value('id'),
        ])->id,
        'student_number' => '2022-1-04313',
        'first_name' => 'No',
        'last_name' => 'Supervisor',
        'section_id' => $student->section_id,
        'is_active' => true,
    ]);

    $this->actingAs($coordinator)
        ->from(route('coordinators.students.index'))
        ->post(route('coordinators.students.evaluations.store-all'), [
            'evaluation_template_id' => $template->id,
        ])
        ->assertRedirect(route('coordinators.students.index'));

    expect(OjtEvaluation::query()->count())->toBe(2);
    expect(OjtEvaluation::query()->where('student_id', $student->id)->exists())->toBeTrue();
    expect(OjtEvaluation::query()->where('student_id', $secondStudent->id)->exists())->toBeTrue();
});

it('blocks supervisors from submitting another supervisors evaluation', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    [
        'coordinator' => $coordinator,
        'supervisorUser' => $supervisorUser,
        'student' => $student,
        'template' => $template,
        'ratingItem' => $ratingItem,
        'textItem' => $textItem,
    ] = createSupervisorEvaluationContext();

    $otherSupervisorUser = User::factory()->create([
        'role_id' => Role::query()->where('name', 'supervisor')->value('id'),
    ]);

    $evaluation = OjtEvaluation::query()->create([
        'student_id' => $student->id,
        'supervisor_id' => $student->supervisor_id,
        'opened_by_user_id' => $coordinator->id,
        'evaluation_template_id' => $template->id,
        'status' => OjtEvaluation::STATUS_PENDING,
        'opened_at' => now(),
    ]);

    $this->actingAs($otherSupervisorUser)
        ->patch(route('supervisors.evaluations.update', $evaluation), [
            'evaluation_date' => now()->toDateString(),
            'responses' => [
                [
                    'item_id' => $ratingItem->id,
                    'rating' => 3,
                ],
                [
                    'item_id' => $textItem->id,
                    'text' => 'Should not work.',
                ],
            ],
        ])
        ->assertForbidden();
});

it('allows a coordinator to create and manage section-private evaluation templates', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    [
        'coordinator' => $coordinator,
        'section' => $section,
    ] = createSupervisorEvaluationContext();

    $this->actingAs($coordinator)
        ->post(route('coordinators.evaluation-templates.store'), [
            'name' => 'Final Evaluation',
            'description' => 'End-of-term review',
            'items' => [
                [
                    'item_type' => 'rating_question',
                    'label' => 'Overall performance',
                    'is_required' => true,
                ],
            ],
        ])
        ->assertRedirect(route('coordinators.evaluation-templates.index'));

    expect(
        OjtEvaluationTemplate::query()
            ->where('section_id', $section->id)
            ->where('name', 'Final Evaluation')
            ->exists(),
    )->toBeTrue();

    $otherCoordinator = User::factory()->create([
        'role_id' => Role::query()->where('name', 'coordinator')->value('id'),
    ]);

    Section::query()->create([
        'course_id' => $section->course_id,
        'school_year_id' => $section->school_year_id,
        'name' => '4B',
        'coordinator_user_id' => $otherCoordinator->id,
        'is_active' => true,
    ]);

    $this->actingAs($otherCoordinator)
        ->get(route('coordinators.evaluation-templates.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->has('templates', 0));
});

it('blocks editing an evaluation template after it has been sent', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    [
        'coordinator' => $coordinator,
        'student' => $student,
        'template' => $template,
    ] = createSupervisorEvaluationContext();

    OjtEvaluation::query()->create([
        'student_id' => $student->id,
        'supervisor_id' => $student->supervisor_id,
        'opened_by_user_id' => $coordinator->id,
        'evaluation_template_id' => $template->id,
        'status' => OjtEvaluation::STATUS_PENDING,
        'opened_at' => now(),
    ]);

    $this->actingAs($coordinator)
        ->put(route('coordinators.evaluation-templates.update', $template), [
            'name' => 'Updated Name',
            'items' => [
                [
                    'item_type' => 'rating_question',
                    'label' => 'Updated question',
                    'is_required' => true,
                ],
            ],
        ])
        ->assertStatus(422);
});

it('flags new pending evaluations for supervisors', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    [
        'coordinator' => $coordinator,
        'supervisorUser' => $supervisorUser,
        'student' => $student,
        'template' => $template,
    ] = createSupervisorEvaluationContext();

    $this->actingAs($coordinator)
        ->post(route('coordinators.students.evaluations.store', $student), [
            'evaluation_template_id' => $template->id,
        ])
        ->assertRedirect();

    $this->actingAs($supervisorUser)
        ->get(route('supervisors.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('evaluation_alerts.new_count', 1)
            ->where('evaluation_alerts.pending_count', 1)
            ->where('interns.0.pending_evaluation.is_new', true));

    $this->actingAs($supervisorUser)
        ->from(route('supervisors.dashboard'))
        ->post(route('supervisors.evaluation-alerts.pending.seen'))
        ->assertRedirect(route('supervisors.dashboard'));

    $this->actingAs($supervisorUser)
        ->get(route('supervisors.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('evaluation_alerts.new_count', 0)
            ->where('interns.0.pending_evaluation.is_new', false));
});

it('flags completed evaluations for coordinators after supervisor submission', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    [
        'coordinator' => $coordinator,
        'supervisorUser' => $supervisorUser,
        'student' => $student,
        'section' => $section,
        'template' => $template,
        'ratingItem' => $ratingItem,
        'textItem' => $textItem,
    ] = createSupervisorEvaluationContext();

    $evaluation = OjtEvaluation::query()->create([
        'student_id' => $student->id,
        'supervisor_id' => $student->supervisor_id,
        'opened_by_user_id' => $coordinator->id,
        'evaluation_template_id' => $template->id,
        'status' => OjtEvaluation::STATUS_PENDING,
        'opened_at' => now()->subHour(),
    ]);

    $this->actingAs($supervisorUser)
        ->patch(route('supervisors.evaluations.update', $evaluation), [
            'evaluation_date' => now()->toDateString(),
            'responses' => [
                [
                    'item_id' => $ratingItem->id,
                    'rating' => 5,
                ],
                [
                    'item_id' => $textItem->id,
                    'text' => 'Excellent intern.',
                ],
            ],
        ])
        ->assertRedirect(route('supervisors.dashboard'));

    $this->actingAs($coordinator)
        ->get(route('coordinators.students.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('evaluation_alerts.new_completed_count', 1)
            ->where('students.0.has_new_completed_evaluation', true));

    $this->actingAs($coordinator)
        ->from(route('coordinators.students.index'))
        ->post(route('coordinators.evaluation-alerts.completed.seen'))
        ->assertRedirect(route('coordinators.students.index'));

    $section->refresh();

    $this->actingAs($coordinator)
        ->get(route('coordinators.students.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('evaluation_alerts.new_completed_count', 0)
            ->where('students.0.has_new_completed_evaluation', false));
});
