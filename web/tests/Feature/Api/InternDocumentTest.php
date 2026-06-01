<?php

use App\Models\DocumentType;
use App\Models\StudentDocument;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;

uses(RefreshDatabase::class);

it('lists documents for the authenticated intern', function () {
    Storage::fake('local');
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    $documentType = DocumentType::query()->create([
        'code' => 'intern_submission',
        'name' => 'Intern submission',
        'is_required' => false,
    ]);

    StudentDocument::query()->create([
        'student_id' => $student->id,
        'document_type_id' => $documentType->id,
        'file_path' => 'student-documents/week-1.pdf',
        'original_filename' => 'week-1.pdf',
        'file_size' => 2048,
        'mime_type' => 'application/pdf',
        'uploaded_at' => now(),
        'notes' => 'Week 1',
    ]);

    Passport::actingAs($student->user);

    $this->getJson('/api/intern/documents')
        ->assertSuccessful()
        ->assertJsonPath('documents.0.title', 'Week 1')
        ->assertJsonPath('documents.0.original_filename', 'week-1.pdf');
});

it('allows an intern to upload a pdf document with a report title', function () {
    Storage::fake('local');
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    Passport::actingAs($student->user);

    $file = UploadedFile::fake()->create('moa.pdf', 120, 'application/pdf');

    $this->postJson('/api/intern/documents', [
        'title' => 'MOA',
        'file' => $file,
    ])
        ->assertCreated()
        ->assertJsonPath('document.title', 'MOA')
        ->assertJsonPath('document.original_filename', 'moa.pdf');

    $this->assertDatabaseHas('student_documents', [
        'student_id' => $student->id,
        'notes' => 'MOA',
    ]);

    Storage::disk('local')->assertExists(
        StudentDocument::query()->first()->file_path,
    );
});

it('rejects unsupported document file types', function () {
    Storage::fake('local');
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    Passport::actingAs($student->user);

    $file = UploadedFile::fake()->create('photo.jpg', 120, 'image/jpeg');

    $this->postJson('/api/intern/documents', [
        'title' => 'Week 1',
        'file' => $file,
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['file']);
});

it('forbids non-intern users from document endpoints', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator] = createCoordinatorWithSection();

    Passport::actingAs($coordinator);

    $this->getJson('/api/intern/documents')->assertForbidden();

    $file = UploadedFile::fake()->create('moa.pdf', 100, 'application/pdf');

    $this->postJson('/api/intern/documents', [
        'title' => 'MOA',
        'file' => $file,
    ])->assertForbidden();
});
