<?php

use App\Models\TimeLog;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Passport\Passport;

uses(RefreshDatabase::class);

it('returns ojt progress for the authenticated intern', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student, 'course' => $course] = createCoordinatorWithSection();

    TimeLog::query()->create([
        'student_id' => $student->id,
        'time_in' => Carbon::parse('2026-05-01 08:00:00'),
        'time_out' => Carbon::parse('2026-05-01 16:00:00'),
        'duration_minutes' => 480,
        'verification_method' => 'facial_recognition',
    ]);

    Passport::actingAs($student->user);

    $this->getJson('/api/intern/progress')
        ->assertSuccessful()
        ->assertJsonPath('student.student_number', $student->student_number)
        ->assertJsonPath('course.required_hours', $course->required_hours)
        ->assertJsonPath('progress.rendered_hours', 8)
        ->assertJsonPath('progress.remaining_hours', 478)
        ->assertJsonPath('progress.percent_complete', 1.6)
        ->assertJsonPath('progress.estimated_end_is_approximate', true)
        ->assertJsonPath('progress.estimated_end_basis', 'default_schedule')
        ->assertJsonPath('progress.estimated_end_date', fn ($value) => is_string($value) && $value !== '');
});

it('forbids non-intern users from the progress endpoint', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator] = createCoordinatorWithSection();

    Passport::actingAs($coordinator);

    $this->getJson('/api/intern/progress')
        ->assertForbidden();
});

it('lets an intern update their ojt schedule', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    Passport::actingAs($student->user);

    $this->putJson('/api/intern/schedule', [
        'hours_per_day' => 8,
        'days_per_week' => 6,
    ])
        ->assertSuccessful()
        ->assertJsonPath('progress.schedule.hours_per_day', 8)
        ->assertJsonPath('progress.schedule.days_per_week', 6)
        ->assertJsonPath('progress.estimated_end_basis', 'schedule')
        ->assertJsonPath('progress.estimated_end_is_approximate', false);

    expect(\App\Models\OjtSchedule::query()->where('student_id', $student->id)->exists())->toBeTrue();
});

it('lets an intern save a monday to thursday schedule', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    Passport::actingAs($student->user);

    $this->putJson('/api/intern/schedule', [
        'hours_per_day' => 8,
        'days_per_week' => 4,
    ])
        ->assertSuccessful()
        ->assertJsonPath('progress.schedule.days_per_week', 4);
});
