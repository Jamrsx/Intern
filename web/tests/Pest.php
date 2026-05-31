<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

use App\Models\Course;
use App\Models\Role;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

function createCoordinatorWithSection(): array
{
    $coordinatorRoleId = Role::query()->where('name', 'coordinator')->value('id');
    $internRoleId = Role::query()->where('name', 'intern')->value('id');
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

    $studentUser = User::factory()->create([
        'role_id' => $internRoleId,
        'email' => 'intern.one@gmail.com',
        'password' => Hash::make('password'),
    ]);

    $student = Student::query()->create([
        'user_id' => $studentUser->id,
        'student_number' => '2022-1-04311',
        'first_name' => 'John',
        'middle_name' => 'Michael',
        'last_name' => 'Doe',
        'section_id' => $section->id,
        'is_active' => true,
    ]);

    return compact('coordinator', 'section', 'student', 'course');
}
