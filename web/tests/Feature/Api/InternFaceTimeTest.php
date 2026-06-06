<?php

use App\Models\OjtSchedule;
use App\Models\StudentFaceProfile;
use App\Models\TimeLog;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Passport\Passport;

uses(RefreshDatabase::class);

/**
 * @return list<float>
 */
function fakeFaceEmbedding(float $value = 0.1): array
{
    return array_fill(0, 128, $value);
}

it('returns time status for an intern without face enrollment', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    Passport::actingAs($student->user);

    $this->getJson('/api/intern/time/status')
        ->assertSuccessful()
        ->assertJsonPath('face_enrolled', false)
        ->assertJsonPath('can_punch_in', false)
        ->assertJsonPath('can_punch_out', false)
        ->assertJsonPath('verification_method', 'facial_recognition_embedded')
        ->assertJsonPath('today_minutes', 0);
});

it('enrolls a face profile from an embedded mobile embedding', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    Passport::actingAs($student->user);

    $this->postJson('/api/intern/face/enroll', [
        'embedding' => fakeFaceEmbedding(),
    ])
        ->assertSuccessful()
        ->assertJsonPath('profile.is_active', true)
        ->assertJsonPath('profile.model', 'faceapi-128-v1');

    expect(StudentFaceProfile::query()->where('student_id', $student->id)->exists())->toBeTrue();
});

it('times in and out with embedded facial verification', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    StudentFaceProfile::query()->create([
        'student_id' => $student->id,
        'reference_image_path' => 'embedded/on-device',
        'face_embedding' => fakeFaceEmbedding(0.1),
        'enrolled_at' => now(),
        'is_active' => true,
    ]);

    Passport::actingAs($student->user);

    $this->postJson('/api/intern/time/punch', [
        'action' => 'time_in',
        'embedding' => fakeFaceEmbedding(0.1),
        'device_info' => 'jest-device',
    ])
        ->assertSuccessful()
        ->assertJsonPath('log.is_open', true);

    $openLog = TimeLog::query()->where('student_id', $student->id)->first();
    expect($openLog)->not->toBeNull();
    expect($openLog->time_out)->toBeNull();
    expect($openLog->verification_method)->toBe('facial_recognition_embedded');

    $this->postJson('/api/intern/time/punch', [
        'action' => 'time_out',
        'embedding' => fakeFaceEmbedding(0.1),
    ])
        ->assertSuccessful()
        ->assertJsonPath('log.is_open', false);

    $openLog->refresh();
    expect($openLog->time_out)->not->toBeNull();
    expect($openLog->duration_minutes)->toBeGreaterThanOrEqual(0);
});

it('creates an ojt schedule on the first time in using the punch date', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    StudentFaceProfile::query()->create([
        'student_id' => $student->id,
        'reference_image_path' => 'embedded/on-device',
        'face_embedding' => fakeFaceEmbedding(0.1),
        'enrolled_at' => now(),
        'is_active' => true,
    ]);

    Passport::actingAs($student->user);

    Carbon::setTestNow(Carbon::parse('2026-06-10 08:15:00', 'Asia/Manila'));

    expect(OjtSchedule::query()->where('student_id', $student->id)->exists())->toBeFalse();

    $this->postJson('/api/intern/time/punch', [
        'action' => 'time_in',
        'embedding' => fakeFaceEmbedding(0.1),
    ])->assertSuccessful();

    $schedule = OjtSchedule::query()->where('student_id', $student->id)->first();
    expect($schedule)->not->toBeNull();
    expect($schedule->start_date?->toDateString())->toBe('2026-06-10');
    expect((float) $schedule->hours_per_day)->toBe(8.0);
    expect($schedule->days_per_week)->toBe(5);
});

it('returns time log history for an intern', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    TimeLog::query()->create([
        'student_id' => $student->id,
        'time_in' => now()->subDays(2)->setTime(9, 0),
        'time_out' => now()->subDays(2)->setTime(12, 0),
        'duration_minutes' => 180,
        'verification_method' => 'facial_recognition_embedded',
    ]);

    TimeLog::query()->create([
        'student_id' => $student->id,
        'time_in' => now()->subDay()->setTime(8, 30),
        'time_out' => now()->subDay()->setTime(17, 0),
        'duration_minutes' => 510,
        'verification_method' => 'facial_recognition_embedded',
    ]);

    Passport::actingAs($student->user);

    $this->getJson('/api/intern/time/logs')
        ->assertSuccessful()
        ->assertJsonCount(2, 'logs')
        ->assertJsonPath('total_count', 2)
        ->assertJsonPath('logs.0.duration_minutes', 510);
});

it('rejects punch when embedded face does not match', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    StudentFaceProfile::query()->create([
        'student_id' => $student->id,
        'reference_image_path' => 'embedded/on-device',
        'face_embedding' => fakeFaceEmbedding(0.1),
        'enrolled_at' => now(),
        'is_active' => true,
    ]);

    Passport::actingAs($student->user);

    $this->postJson('/api/intern/time/punch', [
        'action' => 'time_in',
        'embedding' => fakeFaceEmbedding(0.9),
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['embedding']);
});

it('rejects punch when match distance exceeds the strict threshold', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    StudentFaceProfile::query()->create([
        'student_id' => $student->id,
        'reference_image_path' => 'embedded/on-device',
        'face_embedding' => fakeFaceEmbedding(0.1),
        'enrolled_at' => now(),
        'is_active' => true,
    ]);

    Passport::actingAs($student->user);

    $this->postJson('/api/intern/time/punch', [
        'action' => 'time_in',
        'embedding' => fakeFaceEmbedding(0.15),
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['embedding']);
});

it('forbids non-intern users from time endpoints', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator] = createCoordinatorWithSection();

    Passport::actingAs($coordinator);

    $this->getJson('/api/intern/time/status')->assertForbidden();
});

it('auto times out a morning session at noon and blocks time in until 1pm', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    StudentFaceProfile::query()->create([
        'student_id' => $student->id,
        'reference_image_path' => 'embedded/on-device',
        'face_embedding' => fakeFaceEmbedding(0.1),
        'enrolled_at' => now(),
        'is_active' => true,
    ]);

    Passport::actingAs($student->user);

    Carbon::setTestNow(Carbon::parse('2026-06-10 08:00:00', 'Asia/Manila'));

    $this->postJson('/api/intern/time/punch', [
        'action' => 'time_in',
        'embedding' => fakeFaceEmbedding(0.1),
    ])->assertSuccessful();

    Carbon::setTestNow(Carbon::parse('2026-06-10 12:30:00', 'Asia/Manila'));

    $this->getJson('/api/intern/time/status')
        ->assertSuccessful()
        ->assertJsonPath('can_punch_in', false)
        ->assertJsonPath('open_log', null)
        ->assertJsonPath('lunch_notice.type', 'auto_lunch_timeout');

    $morningLog = TimeLog::query()->where('student_id', $student->id)->firstOrFail();
    expect($morningLog->verification_method)->toBe('auto_lunch_timeout');
    expect($morningLog->time_out?->format('H:i'))->toBe('12:00');
    expect($morningLog->duration_minutes)->toBe(240);

    $this->postJson('/api/intern/time/punch', [
        'action' => 'time_in',
        'embedding' => fakeFaceEmbedding(0.1),
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['action']);

    Carbon::setTestNow(Carbon::parse('2026-06-10 13:00:00', 'Asia/Manila'));

    $this->postJson('/api/intern/time/punch', [
        'action' => 'time_in',
        'embedding' => fakeFaceEmbedding(0.1),
    ])->assertSuccessful();

    Carbon::setTestNow(Carbon::parse('2026-06-10 17:00:00', 'Asia/Manila'));

    $this->postJson('/api/intern/time/punch', [
        'action' => 'time_out',
        'embedding' => fakeFaceEmbedding(0.1),
    ])->assertSuccessful();

    expect(TimeLog::query()->where('student_id', $student->id)->count())->toBe(2);

    $totalMinutes = (int) TimeLog::query()
        ->where('student_id', $student->id)
        ->sum('duration_minutes');

    expect($totalMinutes)->toBe(480);
});
