<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreTimeLogTaskPhotoRequest;
use App\Models\Student;
use App\Models\TimeLog;
use App\Models\TimeLogTaskPhoto;
use App\Services\TimeLogTaskPhotoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class InternTimeTaskPhotoController extends Controller
{
    public function __construct(
        private readonly TimeLogTaskPhotoService $timeLogTaskPhotoService,
    ) {}

    public function store(
        StoreTimeLogTaskPhotoRequest $request,
        TimeLog $timeLog,
    ): JsonResponse {
        $user = $request->user();

        if (! $user->hasRole('intern')) {
            abort(403, 'This endpoint is for intern accounts only.');
        }

        $student = $this->internStudent($user->id);
        $uploadedFile = $request->file('file');

        abort_unless($uploadedFile instanceof UploadedFile, 422, 'Invalid file upload.');

        $photo = $this->timeLogTaskPhotoService->storeDraft(
            $student,
            $timeLog,
            $uploadedFile,
        );

        return response()->json([
            'message' => 'Task photo added for this session.',
            'photo' => $photo,
        ], 201);
    }

    public function show(
        Request $request,
        TimeLog $timeLog,
        TimeLogTaskPhoto $taskPhoto,
    ) {
        $user = $request->user();

        if (! $user->hasRole('intern')) {
            abort(403, 'This endpoint is for intern accounts only.');
        }

        $student = $this->internStudent($user->id);

        abort_unless($taskPhoto->student_id === $student->id, 404);
        abort_unless($taskPhoto->time_log_id === $timeLog->id, 404);
        abort_unless(Storage::disk('local')->exists($taskPhoto->file_path), 404);

        $absolutePath = Storage::disk('local')->path($taskPhoto->file_path);

        return response()->file($absolutePath, [
            'Content-Type' => $taskPhoto->mime_type,
            'Content-Disposition' => 'inline; filename="'.$taskPhoto->original_filename.'"',
        ]);
    }

    public function destroy(
        Request $request,
        TimeLog $timeLog,
        TimeLogTaskPhoto $taskPhoto,
    ): JsonResponse {
        $user = $request->user();

        if (! $user->hasRole('intern')) {
            abort(403, 'This endpoint is for intern accounts only.');
        }

        $student = $this->internStudent($user->id);

        $this->timeLogTaskPhotoService->deleteDraft($student, $timeLog, $taskPhoto);

        return response()->json([
            'message' => 'Task photo removed.',
        ]);
    }

    private function internStudent(int $userId): Student
    {
        return Student::query()
            ->where('user_id', $userId)
            ->firstOrFail();
    }
}
