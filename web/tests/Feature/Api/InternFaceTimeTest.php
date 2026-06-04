<?php

use App\Models\StudentFaceProfile;
use App\Models\TimeLog;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

it('forbids non-intern users from time endpoints', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator] = createCoordinatorWithSection();

    Passport::actingAs($coordinator);

    $this->getJson('/api/intern/time/status')->assertForbidden();
});
