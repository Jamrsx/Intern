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

it('allows a dean to create and bulk import students into sections', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    $deanRoleId = Role::query()->where('name', 'dean')->value('id');
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

    $sectionA = Section::query()->create([
        'course_id' => $course->id,
        'school_year_id' => $schoolYear->id,
        'name' => '4A',
        'is_active' => true,
    ]);

    $sectionB = Section::query()->create([
        'course_id' => $course->id,
        'school_year_id' => $schoolYear->id,
        'name' => '4B',
        'is_active' => true,
    ]);

    $this->actingAs($dean)
        ->post(route('deans.students.store'), [
            'student_number' => '2022-1-04311',
            'email' => 'john.doe@gmail.com',
            'first_name' => 'John',
            'middle_name' => 'Michael',
            'last_name' => 'Doe',
            'section_id' => $sectionA->id,
        ])
        ->assertRedirect(route('deans.students.index'));

    expect(Student::query()->where('section_id', $sectionA->id)->count())->toBe(1);

    $this->actingAs($dean)
        ->post(route('deans.students.bulk-store'), [
            'students' => [
                [
                    'student_number' => '2022-1-04312',
                    'email' => 'jane.doe@gmail.com',
                    'first_name' => 'Jane',
                    'middle_name' => '',
                    'last_name' => 'Doe',
                    'section_id' => $sectionA->id,
                ],
                [
                    'student_number' => '2022-1-04313',
                    'email' => 'juan.cruz@gmail.com',
                    'first_name' => 'Juan',
                    'middle_name' => 'Santos',
                    'last_name' => 'Cruz',
                    'section_id' => $sectionB->id,
                ],
            ],
        ])
        ->assertRedirect(route('deans.students.index'));

    expect(Student::query()->where('section_id', $sectionA->id)->count())->toBe(2);
    expect(Student::query()->where('section_id', $sectionB->id)->count())->toBe(1);
});

it('blocks a dean from adding students to sections outside their scope', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    $deanRoleId = Role::query()->where('name', 'dean')->value('id');
    $schoolYear = SchoolYear::query()->where('name', '2025-2026')->firstOrFail();

    $dean = User::factory()->create([
        'role_id' => $deanRoleId,
    ]);

    $otherDean = User::factory()->create([
        'role_id' => $deanRoleId,
    ]);

    $course = Course::query()->create([
        'code' => 'BSIT',
        'name' => 'Bachelor of Science in Information Technology',
        'required_hours' => 486,
        'dean_user_id' => $dean->id,
        'is_active' => true,
    ]);

    $otherCourse = Course::query()->create([
        'code' => 'BSCS',
        'name' => 'Bachelor of Science in Computer Science',
        'required_hours' => 486,
        'dean_user_id' => $otherDean->id,
        'is_active' => true,
    ]);

    $ownSection = Section::query()->create([
        'course_id' => $course->id,
        'school_year_id' => $schoolYear->id,
        'name' => '4A',
        'is_active' => true,
    ]);

    $foreignSection = Section::query()->create([
        'course_id' => $otherCourse->id,
        'school_year_id' => $schoolYear->id,
        'name' => '4A',
        'is_active' => true,
    ]);

    $this->actingAs($dean)
        ->post(route('deans.students.store'), [
            'student_number' => '2022-1-04311',
            'email' => 'blocked@gmail.com',
            'first_name' => 'Blocked',
            'last_name' => 'Student',
            'section_id' => $foreignSection->id,
        ])
        ->assertSessionHasErrors('section_id');

    expect(Student::query()->where('section_id', $ownSection->id)->count())->toBe(0);
});

it('allows a dean to view an intern profile in their scope', function () {
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

    $internUser = User::factory()->create([
        'role_id' => $internRoleId,
        'email' => 'intern.view@gmail.com',
    ]);

    $student = Student::query()->create([
        'user_id' => $internUser->id,
        'section_id' => $section->id,
        'student_number' => '2022-1-09999',
        'first_name' => 'View',
        'last_name' => 'Test',
        'is_active' => true,
    ]);

    $this->actingAs($dean)
        ->get(route('deans.students.show', $student))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('deans/students/show')
            ->where('student.full_name', 'View Test')
            ->has('progress')
            ->has('documents')
            ->has('attendance_journal'));
});
