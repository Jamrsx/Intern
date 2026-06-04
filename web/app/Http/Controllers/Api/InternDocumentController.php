<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreInternDocumentRequest;
use App\Models\DocumentRequirement;
use App\Models\DocumentType;
use App\Models\Student;
use App\Models\StudentDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

class InternDocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('intern')) {
            abort(403, 'This endpoint is for intern accounts only.');
        }

        $student = $this->internStudent($user->id);

        $documents = $student->documents()
            ->with('documentType:id,code,name')
            ->orderByDesc('uploaded_at')
            ->get()
            ->map(fn (StudentDocument $document) => $this->documentPayload($document));

        return response()->json([
            'documents' => $documents,
        ]);
    }

    public function store(StoreInternDocumentRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('intern')) {
            abort(403, 'This endpoint is for intern accounts only.');
        }

        $student = $this->internStudent($user->id);
        $uploadedFile = $request->file('file');

        abort_unless($uploadedFile instanceof UploadedFile, 422, 'Invalid file upload.');

        $requirement = null;
        $requirementId = $request->validated('document_requirement_id');

        if ($requirementId) {
            $requirement = DocumentRequirement::query()
                ->where('id', $requirementId)
                ->where('section_id', $student->section_id)
                ->where('is_active', true)
                ->first();

            if ($requirement === null) {
                throw ValidationException::withMessages([
                    'document_requirement_id' => [
                        'This document requirement is not available.',
                    ],
                ]);
            }

            $alreadySubmitted = StudentDocument::query()
                ->where('student_id', $student->id)
                ->where('document_requirement_id', $requirement->id)
                ->exists();

            if ($alreadySubmitted) {
                throw ValidationException::withMessages([
                    'document_requirement_id' => [
                        'You have already submitted this document.',
                    ],
                ]);
            }
        }

        $documentType = DocumentType::query()->firstOrCreate(
            ['code' => 'intern_submission'],
            [
                'name' => 'Intern submission',
                'is_required' => false,
            ],
        );

        $storedPath = $uploadedFile->store('student-documents', 'local');
        $title = $requirement?->title ?? $request->validated('title');

        $document = StudentDocument::query()->create([
            'student_id' => $student->id,
            'document_type_id' => $documentType->id,
            'document_requirement_id' => $requirement?->id,
            'file_path' => $storedPath,
            'original_filename' => $uploadedFile->getClientOriginalName(),
            'file_size' => $uploadedFile->getSize(),
            'mime_type' => $uploadedFile->getMimeType() ?? 'application/octet-stream',
            'uploaded_at' => now(),
            'notes' => $title,
        ]);

        $document->load('documentType:id,code,name');

        return response()->json([
            'message' => 'Document uploaded successfully.',
            'document' => $this->documentPayload($document),
        ], 201);
    }

    private function internStudent(int $userId): Student
    {
        return Student::query()
            ->where('user_id', $userId)
            ->firstOrFail();
    }

    /**
     * @return array<string, mixed>
     */
    private function documentPayload(StudentDocument $document): array
    {
        return [
            'id' => $document->id,
            'title' => $document->notes,
            'document_requirement_id' => $document->document_requirement_id,
            'document_type' => $document->documentType->name,
            'document_type_code' => $document->documentType->code,
            'original_filename' => $document->original_filename,
            'file_size' => $document->file_size,
            'mime_type' => $document->mime_type,
            'uploaded_at' => $document->uploaded_at->toIso8601String(),
        ];
    }
}
