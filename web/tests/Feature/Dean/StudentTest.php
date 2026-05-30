<?php

use App\Mail\StudentAccountCredentialsMail;
use App\Models\Course;
use App\Models\Role;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

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

it('allows a dean to email student credentials individually and in bulk', function () {
    Mail::fake();

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

    $createStudent = function (string $email, string $studentNumber) use ($internRoleId, $section) {
        $user = User::factory()->create([
            'email' => $email,
            'password' => 'old-password',
            'role_id' => $internRoleId,
            'is_active' => true,
        ]);

        return Student::query()->create([
            'user_id' => $user->id,
            'student_number' => $studentNumber,
            'first_name' => 'John',
            'middle_name' => null,
            'last_name' => 'Doe',
            'section_id' => $section->id,
            'is_active' => true,
        ]);
    };

    $studentOne = $createStudent('john.doe@gmail.com', '2022-1-04311');
    $studentTwo = $createStudent('jane.doe@gmail.com', '2022-1-04312');
    $originalPasswordHash = $studentOne->user->password;

    $this->actingAs($dean)
        ->post(route('deans.students.mail-credentials', $studentOne))
        ->assertRedirect(route('deans.students.index'));

    Mail::assertSent(StudentAccountCredentialsMail::class, function (StudentAccountCredentialsMail $mail) use ($studentOne) {
        return $mail->hasTo($studentOne->user->email)
            && $mail->student->is($studentOne);
    });

    expect($studentOne->fresh()?->user?->password)->not->toBe($originalPasswordHash);
    expect(Hash::check('old-password', (string) $studentOne->fresh()?->user?->password))->toBeFalse();

    Mail::fake();

    $this->actingAs($dean)
        ->post(route('deans.students.mail-all-credentials'))
        ->assertRedirect(route('deans.students.index'));

    Mail::assertSent(StudentAccountCredentialsMail::class, 2);
    Mail::assertSent(StudentAccountCredentialsMail::class, fn (StudentAccountCredentialsMail $mail) => $mail->hasTo($studentOne->user->email));
    Mail::assertSent(StudentAccountCredentialsMail::class, fn (StudentAccountCredentialsMail $mail) => $mail->hasTo($studentTwo->user->email));
});
