<?php

use App\Models\StudentFaceProfile;
use App\Models\TimeLog;
use App\Models\TimeLogTaskPhoto;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;

uses(RefreshDatabase::class);

/**
 * @return list<float>
 */
function taskPhotoFakeEmbedding(float $value = 0.1): array
{
    return array_fill(0, 128, $value);
}

it('uploads draft task photos during an open session and submits them on time out', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    StudentFaceProfile::query()->create([
        'student_id' => $student->id,
        'reference_image_path' => 'embedded/on-device',
        'face_embedding' => taskPhotoFakeEmbedding(),
        'enrolled_at' => now(),
        'is_active' => true,
    ]);

    Passport::actingAs($student->user);

    Carbon::setTestNow(Carbon::parse('2026-06-10 08:05:00', 'Asia/Manila'));

    $this->postJson('/api/intern/time/punch', [
        'action' => 'time_in',
        'embedding' => taskPhotoFakeEmbedding(),
    ])->assertSuccessful()
        ->assertJsonPath('log.session_period', 'morning');

    $openLog = TimeLog::query()->where('student_id', $student->id)->firstOrFail();

    $this->post("/api/intern/time/logs/{$openLog->id}/task-photos", [
        'file' => UploadedFile::fake()->image('morning-task-1.jpg'),
    ])
        ->assertCreated()
        ->assertJsonPath('photo.status', 'draft')
        ->assertJsonPath('photo.image_url', url("/api/intern/time/logs/{$openLog->id}/task-photos/1"));

    $this->post("/api/intern/time/logs/{$openLog->id}/task-photos", [
        'file' => UploadedFile::fake()->image('morning-task-2.jpg'),
    ])->assertCreated();

    $this->getJson('/api/intern/time/status')
        ->assertSuccessful()
        ->assertJsonPath('open_log.task_photos_count', 2)
        ->assertJsonStructure([
            'open_log' => [
                'task_photos' => [
                    ['id', 'image_url'],
                ],
            ],
        ]);

    $this->postJson('/api/intern/time/punch', [
        'action' => 'time_out',
        'embedding' => taskPhotoFakeEmbedding(),
    ])->assertSuccessful()
        ->assertJsonPath('log.submitted_task_photos_count', 2);

    expect(
        TimeLogTaskPhoto::query()
            ->where('time_log_id', $openLog->id)
            ->where('status', TimeLogTaskPhoto::STATUS_SUBMITTED)
            ->count(),
    )->toBe(2);
});

it('allows an intern to fetch a draft task photo image for preview', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    StudentFaceProfile::query()->create([
        'student_id' => $student->id,
        'reference_image_path' => 'embedded/on-device',
        'face_embedding' => taskPhotoFakeEmbedding(),
        'enrolled_at' => now(),
        'is_active' => true,
    ]);

    Passport::actingAs($student->user);

    $this->postJson('/api/intern/time/punch', [
        'action' => 'time_in',
        'embedding' => taskPhotoFakeEmbedding(),
    ])->assertSuccessful();

    $openLog = TimeLog::query()->where('student_id', $student->id)->firstOrFail();

    $this->post("/api/intern/time/logs/{$openLog->id}/task-photos", [
        'file' => UploadedFile::fake()->image('preview.jpg'),
    ])->assertCreated();

    $photo = TimeLogTaskPhoto::query()->where('time_log_id', $openLog->id)->firstOrFail();
    Storage::disk('local')->assertExists($photo->file_path);

    $this->getJson("/api/intern/time/logs/{$openLog->id}/task-photos/{$photo->id}")
        ->assertOk()
        ->assertHeader('content-type', 'image/jpeg');
});

it('requires at least one task photo before manual time out', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    StudentFaceProfile::query()->create([
        'student_id' => $student->id,
        'reference_image_path' => 'embedded/on-device',
        'face_embedding' => taskPhotoFakeEmbedding(),
        'enrolled_at' => now(),
        'is_active' => true,
    ]);

    Passport::actingAs($student->user);

    $this->postJson('/api/intern/time/punch', [
        'action' => 'time_in',
        'embedding' => taskPhotoFakeEmbedding(),
    ])->assertSuccessful();

    $this->postJson('/api/intern/time/punch', [
        'action' => 'time_out',
        'embedding' => taskPhotoFakeEmbedding(),
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['task_photos']);
});

it('submits draft task photos when lunch auto timeout closes the morning session', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    StudentFaceProfile::query()->create([
        'student_id' => $student->id,
        'reference_image_path' => 'embedded/on-device',
        'face_embedding' => taskPhotoFakeEmbedding(),
        'enrolled_at' => now(),
        'is_active' => true,
    ]);

    Passport::actingAs($student->user);

    Carbon::setTestNow(Carbon::parse('2026-06-10 08:00:00', 'Asia/Manila'));

    $this->postJson('/api/intern/time/punch', [
        'action' => 'time_in',
        'embedding' => taskPhotoFakeEmbedding(),
    ])->assertSuccessful();

    $openLog = TimeLog::query()->where('student_id', $student->id)->firstOrFail();

    $this->post("/api/intern/time/logs/{$openLog->id}/task-photos", [
        'file' => UploadedFile::fake()->image('morning-task.jpg'),
    ])->assertCreated();

    Carbon::setTestNow(Carbon::parse('2026-06-10 12:30:00', 'Asia/Manila'));

    $this->getJson('/api/intern/time/status')->assertSuccessful();

    expect(
        TimeLogTaskPhoto::query()
            ->where('time_log_id', $openLog->id)
            ->where('status', TimeLogTaskPhoto::STATUS_SUBMITTED)
            ->count(),
    )->toBe(1);
});

it('allows deleting draft task photos before time out', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    StudentFaceProfile::query()->create([
        'student_id' => $student->id,
        'reference_image_path' => 'embedded/on-device',
        'face_embedding' => taskPhotoFakeEmbedding(),
        'enrolled_at' => now(),
        'is_active' => true,
    ]);

    Passport::actingAs($student->user);

    $this->postJson('/api/intern/time/punch', [
        'action' => 'time_in',
        'embedding' => taskPhotoFakeEmbedding(),
    ])->assertSuccessful();

    $openLog = TimeLog::query()->where('student_id', $student->id)->firstOrFail();

    $this->post("/api/intern/time/logs/{$openLog->id}/task-photos", [
        'file' => UploadedFile::fake()->image('draft.jpg'),
    ])->assertCreated();

    $photo = TimeLogTaskPhoto::query()->where('time_log_id', $openLog->id)->firstOrFail();

    $this->deleteJson("/api/intern/time/logs/{$openLog->id}/task-photos/{$photo->id}")
        ->assertSuccessful();

    expect(TimeLogTaskPhoto::query()->where('time_log_id', $openLog->id)->count())->toBe(0);
});
