<?php

use App\Models\OjtAbsence;
use App\Models\OjtSchedule;
use App\Models\StudentFaceProfile;
use App\Models\TimeLog;
use App\Support\OjtWorkDayCalendar;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Laravel\Passport\Passport;

uses(RefreshDatabase::class);

/**
 * @return list<float>
 */
function absenceFakeEmbedding(float $value = 0.1): array
{
    return array_fill(0, 128, $value);
}

it('maps days per week to monday-based work days', function () {
    $wednesday = Carbon::parse('2026-06-03');

    expect(OjtWorkDayCalendar::isScheduledWeekday(4, $wednesday))->toBeTrue();
    expect(OjtWorkDayCalendar::isScheduledWeekday(5, $wednesday))->toBeTrue();
    expect(OjtWorkDayCalendar::isScheduledWeekday(6, $wednesday))->toBeTrue();

    $friday = Carbon::parse('2026-06-05');
    $saturday = Carbon::parse('2026-06-06');

    expect(OjtWorkDayCalendar::isScheduledWeekday(5, $friday))->toBeTrue();
    expect(OjtWorkDayCalendar::isScheduledWeekday(5, $saturday))->toBeFalse();
    expect(OjtWorkDayCalendar::isScheduledWeekday(6, $saturday))->toBeTrue();

    $thursday = Carbon::parse('2026-06-04');
    expect(OjtWorkDayCalendar::isScheduledWeekday(4, $thursday))->toBeTrue();
    expect(OjtWorkDayCalendar::isScheduledWeekday(4, $friday))->toBeFalse();
});

it('detects absence on a scheduled day without time in after cutoff', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    OjtSchedule::query()->create([
        'student_id' => $student->id,
        'hours_per_day' => 8,
        'days_per_week' => 6,
        'start_date' => '2026-06-01',
    ]);

    Passport::actingAs($student->user);

    Carbon::setTestNow(Carbon::parse('2026-06-04 18:00:00', 'Asia/Manila'));

    $response = $this->getJson('/api/intern/absences')->assertSuccessful();

    $response
        ->assertJsonPath('today_attendance.status', 'absent')
        ->assertJsonPath('today_attendance.hours', 0);

    expect(
        OjtAbsence::query()
            ->where('student_id', $student->id)
            ->whereDate('absence_date', '2026-06-04')
            ->exists(),
    )->toBeTrue();
});

it('does not mark absence on non-scheduled sunday for a six-day schedule', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    OjtSchedule::query()->create([
        'student_id' => $student->id,
        'hours_per_day' => 8,
        'days_per_week' => 6,
        'start_date' => '2026-06-01',
    ]);

    Passport::actingAs($student->user);

    Carbon::setTestNow(Carbon::parse('2026-06-07 18:00:00', 'Asia/Manila'));

    $this->getJson('/api/intern/absences')
        ->assertSuccessful()
        ->assertJsonPath('today_attendance.status', 'off_schedule');

    expect(
        OjtAbsence::query()
            ->where('student_id', $student->id)
            ->whereDate('absence_date', '2026-06-07')
            ->exists(),
    )->toBeFalse();
});

it('removes absence when student times in on the same day', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    StudentFaceProfile::query()->create([
        'student_id' => $student->id,
        'reference_image_path' => 'embedded/on-device',
        'face_embedding' => absenceFakeEmbedding(),
        'enrolled_at' => now(),
        'is_active' => true,
    ]);

    OjtSchedule::query()->create([
        'student_id' => $student->id,
        'hours_per_day' => 8,
        'days_per_week' => 5,
        'start_date' => '2026-06-01',
    ]);

    OjtAbsence::query()->create([
        'student_id' => $student->id,
        'absence_date' => '2026-06-04',
        'status' => OjtAbsence::STATUS_DETECTED,
    ]);

    Passport::actingAs($student->user);

    Carbon::setTestNow(Carbon::parse('2026-06-04 08:30:00', 'Asia/Manila'));

    $this->postJson('/api/intern/time/punch', [
        'action' => 'time_in',
        'embedding' => absenceFakeEmbedding(),
    ])->assertSuccessful();

    $this->getJson('/api/intern/absences')
        ->assertSuccessful()
        ->assertJsonPath('today_attendance.status', 'present');

    expect(
        OjtAbsence::query()
            ->where('student_id', $student->id)
            ->whereDate('absence_date', '2026-06-04')
            ->exists(),
    )->toBeFalse();
});

it('allows an intern to justify an absence with optional proof', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    $absence = OjtAbsence::query()->create([
        'student_id' => $student->id,
        'absence_date' => '2026-06-03',
        'status' => OjtAbsence::STATUS_DETECTED,
    ]);

    Passport::actingAs($student->user);

    $this->post("/api/intern/absences/{$absence->id}/justify", [
        'reason' => 'I was sick and unable to report to my OJT site.',
        'proof' => UploadedFile::fake()->image('medical.jpg'),
    ])
        ->assertSuccessful()
        ->assertJsonPath('absence.status', 'justified');

    $absence->refresh();
    expect($absence->isJustified())->toBeTrue();
    expect($absence->reason)->toContain('sick');
    expect($absence->proof_file_path)->not->toBeNull();
});

it('shows attendance journal on coordinator student detail', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'student' => $student] = createCoordinatorWithSection();

    OjtSchedule::query()->create([
        'student_id' => $student->id,
        'hours_per_day' => 8,
        'days_per_week' => 5,
        'start_date' => '2026-06-01',
    ]);

    OjtAbsence::query()->create([
        'student_id' => $student->id,
        'absence_date' => '2026-06-03',
        'status' => OjtAbsence::STATUS_JUSTIFIED,
        'reason' => 'Family emergency',
        'justification_submitted_at' => now(),
    ]);

    $this->actingAs($coordinator)
        ->get(route('coordinators.students.show', $student))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coordinator/students/show')
            ->where('attendance_journal.schedule_label', 'Monday–Friday')
            ->where('attendance_journal.absence_count', 1)
            ->where('attendance_journal.absences.0.reason', 'Family emergency'));
});
