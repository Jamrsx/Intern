<?php

use App\Models\Course;
use App\Models\Role;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;

it('includes section and coordinator details on the dean students page', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    $deanRoleId = Role::query()->where('name', 'dean')->value('id');
    $coordinatorRoleId = Role::query()->where('name', 'coordinator')->value('id');
    $schoolYear = SchoolYear::query()->where('name', '2025-2026')->firstOrFail();

    $dean = User::factory()->create([
        'role_id' => $deanRoleId,
    ]);

    $coordinator = User::factory()->create([
        'role_id' => $coordinatorRoleId,
        'name' => 'Coordinator Ana',
        'email' => 'ana.coordinator@occ.edu.ph',
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
        'coordinator_user_id' => $coordinator->id,
        'is_active' => true,
    ]);

    $internRoleId = Role::query()->where('name', 'intern')->value('id');

    $internUser = User::factory()->create([
        'role_id' => $internRoleId,
        'email' => 'intern@occ.edu.ph',
    ]);

    Student::query()->create([
        'user_id' => $internUser->id,
        'section_id' => $section->id,
        'student_number' => '2022-1-09999',
        'first_name' => 'Test',
        'last_name' => 'Intern',
        'is_active' => true,
    ]);

    $this->actingAs($dean)
        ->get(route('deans.students.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('deans/students')
            ->has('sections', 1)
            ->where('sections.0.coordinator.name', 'Coordinator Ana')
            ->has('students', 1)
            ->where('students.0.section.display_name', 'BSIT 4A')
            ->where('students.0.section.coordinator.email', 'ana.coordinator@occ.edu.ph'));
});

it('does not expose dean student mutation routes', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    $dean = User::factory()->create([
        'role_id' => Role::query()->where('name', 'dean')->value('id'),
    ]);

    $this->actingAs($dean)
        ->post('/deans/students/bulk', ['students' => []])
        ->assertNotFound();

    $this->actingAs($dean)
        ->post('/deans/students/mail-credentials')
        ->assertNotFound();

    $this->actingAs($dean)
        ->post('/deans/students', [])
        ->assertMethodNotAllowed();
});
