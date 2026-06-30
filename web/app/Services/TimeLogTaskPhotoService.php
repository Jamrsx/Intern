<?php

namespace App\Services;

use App\Models\Student;
use App\Models\TimeLog;
use App\Models\TimeLogTaskPhoto;
use App\Support\LunchBreak;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class TimeLogTaskPhotoService
{
    public const MAX_PHOTOS_PER_SESSION = 10;

    /**
     * @return array<string, mixed>
     */
    public function storeDraft(
        Student $student,
        TimeLog $timeLog,
        UploadedFile $file,
    ): array {
        $this->assertOpenLogOwnedByStudent($student, $timeLog);

        $draftCount = $timeLog->taskPhotos()
            ->where('status', TimeLogTaskPhoto::STATUS_DRAFT)
            ->count();

        if ($draftCount >= self::MAX_PHOTOS_PER_SESSION) {
            throw ValidationException::withMessages([
                'file' => [
                    sprintf(
                        'You can upload up to %d task photos per session.',
                        self::MAX_PHOTOS_PER_SESSION,
                    ),
                ],
            ]);
        }

        $storedPath = $file->store('time-log-task-photos', 'local');

        $photo = TimeLogTaskPhoto::query()->create([
            'time_log_id' => $timeLog->id,
            'student_id' => $student->id,
            'file_path' => $storedPath,
            'original_filename' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType() ?? 'image/jpeg',
            'status' => TimeLogTaskPhoto::STATUS_DRAFT,
        ]);

        return $this->photoPayload(
            $photo,
            self::internApiImageUrl($timeLog, $photo),
        );
    }

    public static function internApiImageUrl(TimeLog $timeLog, TimeLogTaskPhoto $photo): string
    {
        return url("/api/intern/time/logs/{$timeLog->id}/task-photos/{$photo->id}");
    }

    public function deleteDraft(
        Student $student,
        TimeLog $timeLog,
        TimeLogTaskPhoto $photo,
    ): void {
        $this->assertOpenLogOwnedByStudent($student, $timeLog);

        if ($photo->time_log_id !== $timeLog->id || $photo->student_id !== $student->id) {
            abort(404);
        }

        if (! $photo->isDraft()) {
            throw ValidationException::withMessages([
                'photo' => ['Submitted task photos cannot be removed.'],
            ]);
        }

        Storage::disk('local')->delete($photo->file_path);
        $photo->delete();
    }

    public function finalizeForLog(TimeLog $timeLog): int
    {
        $draftPhotos = $timeLog->taskPhotos()
            ->where('status', TimeLogTaskPhoto::STATUS_DRAFT)
            ->get();

        if ($draftPhotos->isEmpty()) {
            return 0;
        }

        $submittedAt = now();

        foreach ($draftPhotos as $photo) {
            $photo->update([
                'status' => TimeLogTaskPhoto::STATUS_SUBMITTED,
                'submitted_at' => $submittedAt,
            ]);
        }

        return $draftPhotos->count();
    }

    public function assertHasDraftPhotos(TimeLog $timeLog): void
    {
        $hasDraft = $timeLog->taskPhotos()
            ->where('status', TimeLogTaskPhoto::STATUS_DRAFT)
            ->exists();

        if (! $hasDraft) {
            throw ValidationException::withMessages([
                'task_photos' => [
                    'Add at least one task photo before timing out.',
                ],
            ]);
        }
    }

    public static function resolveSessionPeriod(\DateTimeInterface $timeIn): string
    {
        $moment = \Illuminate\Support\Carbon::instance($timeIn);
        $lunchAt = LunchBreak::lunchAt($moment);

        return $moment->lt($lunchAt) ? 'morning' : 'afternoon';
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function draftPhotosPayload(TimeLog $timeLog, bool $includeImageUrl = false): array
    {
        return $timeLog->taskPhotos()
            ->where('status', TimeLogTaskPhoto::STATUS_DRAFT)
            ->orderBy('id')
            ->get()
            ->map(fn (TimeLogTaskPhoto $photo) => $this->photoPayload(
                $photo,
                $includeImageUrl ? self::internApiImageUrl($timeLog, $photo) : null,
            ))
            ->values()
            ->all();
    }

    public function submittedCount(TimeLog $timeLog): int
    {
        return $timeLog->taskPhotos()
            ->where('status', TimeLogTaskPhoto::STATUS_SUBMITTED)
            ->count();
    }

    /**
     * @return array<string, mixed>
     */
    /**
     * @return array<string, mixed>
     */
    public function photoPayload(TimeLogTaskPhoto $photo, ?string $imageUrl = null): array
    {
        return [
            'id' => $photo->id,
            'time_log_id' => $photo->time_log_id,
            'original_filename' => $photo->original_filename,
            'file_size' => $photo->file_size,
            'mime_type' => $photo->mime_type,
            'status' => $photo->status,
            'submitted_at' => $photo->submitted_at?->toIso8601String(),
            'created_at' => $photo->created_at?->toIso8601String(),
            'image_url' => $imageUrl,
        ];
    }

    private function assertOpenLogOwnedByStudent(Student $student, TimeLog $timeLog): void
    {
        if ($timeLog->student_id !== $student->id) {
            abort(404);
        }

        if ($timeLog->time_out !== null) {
            throw ValidationException::withMessages([
                'time_log' => ['This session is closed. Task photos can only be added while timed in.'],
            ]);
        }
    }
}
