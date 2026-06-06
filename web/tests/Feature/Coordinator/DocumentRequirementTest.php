<?php

use App\Models\DocumentRequirement;
use App\Models\StudentDocument;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;

uses(RefreshDatabase::class);

it('allows coordinators to create document requirements for their section', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'section' => $section] = createCoordinatorWithSection();

    $deadline = now()->addDays(5)->format('Y-m-d H:i:s');

    $this->actingAs($coordinator)
        ->post(route('coordinators.document-requirements.store'), [
            'title' => 'MOA',
            'description' => 'Submit signed memorandum of agreement.',
            'deadline_at' => $deadline,
            'accepted_file_types' => 'pdf_only',
        ])
        ->assertRedirect(route('coordinators.document-requirements.index'));

    $this->assertDatabaseHas('document_requirements', [
        'section_id' => $section->id,
        'title' => 'MOA',
        'accepted_file_types' => 'pdf_only',
        'created_by_user_id' => $coordinator->id,
    ]);
});

it('lists document requirements for interns with submission status', function () {
    Storage::fake('local');
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'student' => $student, 'section' => $section] = createCoordinatorWithSection();

    $requirement = DocumentRequirement::query()->create([
        'section_id' => $section->id,
        'created_by_user_id' => $coordinator->id,
        'title' => 'Week 1',
        'deadline_at' => now()->addWeek(),
        'is_active' => true,
    ]);

    Passport::actingAs($student->user);

    $this->getJson('/api/intern/document-requirements')
        ->assertSuccessful()
        ->assertJsonPath('requirements.0.title', 'Week 1')
        ->assertJsonPath('requirements.0.status', 'pending')
        ->assertJsonPath('requirements.0.is_new', true)
        ->assertJsonPath('pending_count', 1)
        ->assertJsonPath('new_count', 1)
        ->assertJsonPath('unread_count', 1);

    $this->postJson('/api/intern/document-requirements/seen')
        ->assertSuccessful();

    $seenResponse = $this->getJson('/api/intern/document-requirements')
        ->assertSuccessful();

    expect($seenResponse->json('new_count'))->toBe(0);
    expect($seenResponse->json('unread_count'))->toBe(1);
    expect($seenResponse->json('requirements.0.is_new'))->toBeFalse();

    $file = UploadedFile::fake()->create('week1.pdf', 100, 'application/pdf');

    $this->postJson('/api/intern/documents', [
        'document_requirement_id' => $requirement->id,
        'file' => $file,
    ])->assertCreated();

    $this->getJson('/api/intern/document-requirements')
        ->assertJsonPath('requirements.0.status', 'submitted')
        ->assertJsonPath('pending_count', 0);
});

it('prevents duplicate submission for the same requirement', function () {
    Storage::fake('local');
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'student' => $student, 'section' => $section] = createCoordinatorWithSection();

    $requirement = DocumentRequirement::query()->create([
        'section_id' => $section->id,
        'created_by_user_id' => $coordinator->id,
        'title' => 'MOA',
        'deadline_at' => now()->addWeek(),
        'is_active' => true,
    ]);

    Passport::actingAs($student->user);

    $file = UploadedFile::fake()->create('moa.pdf', 100, 'application/pdf');

    $this->postJson('/api/intern/documents', [
        'document_requirement_id' => $requirement->id,
        'file' => $file,
    ])->assertCreated();

    $this->postJson('/api/intern/documents', [
        'document_requirement_id' => $requirement->id,
        'file' => $file,
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['document_requirement_id']);
});

it('rejects word uploads when requirement accepts pdf only', function () {
    Storage::fake('local');
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'student' => $student, 'section' => $section] = createCoordinatorWithSection();

    $requirement = DocumentRequirement::query()->create([
        'section_id' => $section->id,
        'created_by_user_id' => $coordinator->id,
        'title' => 'Signed MOA',
        'deadline_at' => now()->addWeek(),
        'accepted_file_types' => 'pdf_only',
        'is_active' => true,
    ]);

    Passport::actingAs($student->user);

    $docx = UploadedFile::fake()->create('moa.docx', 100, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');

    $this->postJson('/api/intern/documents', [
        'document_requirement_id' => $requirement->id,
        'file' => $docx,
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['file']);

    $pdf = UploadedFile::fake()->create('moa.pdf', 100, 'application/pdf');

    $this->postJson('/api/intern/documents', [
        'document_requirement_id' => $requirement->id,
        'file' => $pdf,
    ])->assertCreated();
});
