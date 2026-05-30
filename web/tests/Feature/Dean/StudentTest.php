<?php

use App\Models\Course;
use App\Models\Role;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;

it('allows a dean to create and update students', function () {
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

    $section = Section::query()->create([
        'course_id' => $course->id,
        'school_year_id' => $schoolYear->id,
        'name' => '4A',
        'is_active' => true,
    ]);

    $this->actingAs($dean)
        ->post(route('deans.students.store'), [
            'student_number' => '2022-1-04311',
            'email' => 'john.doe@gmail.com',
            'first_name' => 'John',
            'middle_name' => 'Michael',
            'last_name' => 'Doe',
            'section_id' => $section->id,
        ])
        ->assertRedirect(route('deans.students.index'));

    $student = Student::query()->whereHas('user', fn ($query) => $query->where('email', 'john.doe@gmail.com'))->first();

    expect($student)->not->toBeNull();
    expect($student?->student_number)->toBe('2022-1-04311');
    expect($student?->fullName())->toBe('John Michael Doe');
    expect($student?->section_id)->toBe($section->id);

    $this->actingAs($dean)
        ->post(route('deans.students.bulk-store'), [
            'section_id' => $section->id,
            'students' => [
                [
                    'student_number' => '2022-1-04312',
                    'email' => 'jane.doe@gmail.com',
                    'first_name' => 'Jane',
                    'middle_name' => '',
                    'last_name' => 'Doe',
                ],
                [
                    'student_number' => '2022-1-04313',
                    'email' => 'juan.cruz@gmail.com',
                    'first_name' => 'Juan',
                    'middle_name' => 'Santos',
                    'last_name' => 'Cruz',
                ],
            ],
        ])
        ->assertRedirect(route('deans.students.index'));

    expect(Student::query()->count())->toBe(3);

    $this->actingAs($dean)
        ->patch(route('deans.students.update', $student), [
            'student_number' => '2022-1-04311',
            'email' => 'john.updated@gmail.com',
            'first_name' => 'John',
            'middle_name' => 'Michael',
            'last_name' => 'Doe',
            'section_id' => $section->id,
            'is_active' => '1',
        ])
        ->assertRedirect(route('deans.students.index'));

    expect($student->fresh()?->user?->email)->toBe('john.updated@gmail.com');
});
