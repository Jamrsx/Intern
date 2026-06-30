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

it('allows a coordinator to create and update students', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'section' => $section] = createCoordinatorWithSection();

    $this->actingAs($coordinator)
        ->post(route('coordinators.students.store'), [
            'student_number' => '2022-1-09001',
            'email' => 'john.doe@gmail.com',
            'first_name' => 'John',
            'middle_name' => 'Michael',
            'last_name' => 'Doe',
        ])
        ->assertRedirect(route('coordinators.students.index'));

    $student = Student::query()->whereHas('user', fn ($query) => $query->where('email', 'john.doe@gmail.com'))->first();

    expect($student)->not->toBeNull();
    expect($student?->student_number)->toBe('2022-1-09001');
    expect($student?->fullName())->toBe('John Michael Doe');
    expect($student?->section_id)->toBe($section->id);
    expect(Hash::check('password', (string) $student?->user?->password))->toBeTrue();

    $this->actingAs($coordinator)
        ->post(route('coordinators.students.bulk-store'), [
            'students' => [
                [
                    'student_number' => '2022-1-09002',
                    'email' => 'jane.doe@gmail.com',
                    'first_name' => 'Jane',
                    'middle_name' => '',
                    'last_name' => 'Doe',
                ],
                [
                    'student_number' => '2022-1-09003',
                    'email' => 'juan.cruz@gmail.com',
                    'first_name' => 'Juan',
                    'middle_name' => 'Santos',
                    'last_name' => 'Cruz',
                ],
            ],
        ])
        ->assertRedirect(route('coordinators.students.index'));

    expect(Student::query()->where('section_id', $section->id)->count())->toBe(4);

    $this->actingAs($coordinator)
        ->patch(route('coordinators.students.update', $student), [
            'student_number' => '2022-1-09001',
            'email' => 'john.updated@gmail.com',
            'first_name' => 'John',
            'middle_name' => 'Michael',
            'last_name' => 'Doe',
        ])
        ->assertRedirect();

    expect($student->fresh()?->user?->email)->toBe('john.updated@gmail.com');
});

it('allows a coordinator to deactivate students', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'student' => $student] = createCoordinatorWithSection();

    $this->actingAs($coordinator)
        ->delete(route('coordinators.students.destroy', $student))
        ->assertRedirect(route('coordinators.students.index'));

    expect($student->fresh()?->is_active)->toBeFalse();
    expect($student->fresh()?->user?->is_active)->toBeFalse();
});

it('allows a coordinator to email student credentials individually and in bulk', function () {
    Mail::fake();

    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'section' => $section] = createCoordinatorWithSection();
    $internRoleId = Role::query()->where('name', 'intern')->value('id');

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

    $studentOne = $createStudent('extra.one@gmail.com', '2022-1-09010');
    $studentTwo = $createStudent('extra.two@gmail.com', '2022-1-09011');
    $originalPasswordHash = $studentOne->user->password;

    $this->actingAs($coordinator)
        ->post(route('coordinators.students.mail-credentials', $studentOne))
        ->assertRedirect(route('coordinators.students.index'));

    Mail::assertSent(StudentAccountCredentialsMail::class, function (StudentAccountCredentialsMail $mail) use ($studentOne) {
        return $mail->hasTo($studentOne->user->email)
            && $mail->student->is($studentOne)
            && $mail->plainPassword === 'password';
    });

    expect($studentOne->fresh()?->user?->password)->not->toBe($originalPasswordHash);
    expect(Hash::check('password', (string) $studentOne->fresh()?->user?->password))->toBeTrue();

    Mail::fake();

    $this->actingAs($coordinator)
        ->post(route('coordinators.students.mail-all-credentials'))
        ->assertRedirect(route('coordinators.students.index'));

    Mail::assertSent(StudentAccountCredentialsMail::class, 3);
});

it('prevents a dean from mutating students', function () {
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
        ->post('/deans/students', [
            'student_number' => '2022-1-04311',
            'email' => 'john.doe@gmail.com',
            'first_name' => 'John',
            'last_name' => 'Doe',
            'section_id' => $section->id,
        ])
        ->assertMethodNotAllowed();

    $this->actingAs($dean)
        ->get(route('deans.students.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('deans/students'));
});
