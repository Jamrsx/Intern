<?php

namespace App\Services;

use App\Models\Student;
use App\Models\StudentFaceProfile;
use App\Models\TimeLog;
use App\Support\FaceEmbedding;
use App\Support\FaceMatcher;
use App\Support\LunchBreak;
use App\Support\OjtSchedulePersister;
use Illuminate\Validation\ValidationException;

class InternTimePunchService
{
    public function __construct(
        private readonly LunchAutoTimeoutService $lunchAutoTimeoutService,
        private readonly CompanyGeofenceGuard $companyGeofenceGuard,
        private readonly TimeLogTaskPhotoService $timeLogTaskPhotoService,
        private readonly OjtAbsenceSyncService $ojtAbsenceSyncService,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function status(Student $student): array
    {
        $justApplied = $this->lunchAutoTimeoutService->applyIfNeeded($student);

        $today = now()->startOfDay();
        $faceProfile = $student->faceProfile()
            ->where('is_active', true)
            ->first();

        $openLog = $this->openTimeLog($student);

        $todayLogs = $student->timeLogs()
            ->where('time_in', '>=', $today)
            ->orderBy('time_in')
            ->get();

        $todayMinutes = (int) $todayLogs->sum(function (TimeLog $log): int {
            if ($log->duration_minutes !== null) {
                return (int) $log->duration_minutes;
            }

            if ($log->time_out === null) {
                return (int) $log->time_in->diffInMinutes(now());
            }

            return 0;
        });

        $blockedByLunchWindow = LunchBreak::isWithinLunchBreakWindow(now());
        $todayAttendance = $this->ojtAbsenceSyncService->todayAttendancePayload($student);

        return [
            'face_enrolled' => $faceProfile !== null,
            'face_enrolled_at' => $faceProfile?->enrolled_at?->toIso8601String(),
            'face_embedding' => is_array($faceProfile?->face_embedding)
                ? $faceProfile->face_embedding
                : null,
            'verification_method' => 'facial_recognition_embedded',
            'can_punch_in' => $openLog === null
                && $faceProfile !== null
                && ! $blockedByLunchWindow,
            'can_punch_out' => $openLog !== null && $faceProfile !== null,
            'open_log' => $openLog ? $this->logPayload($openLog) : null,
            'today_segments' => $todayLogs->map(fn (TimeLog $log) => $this->logPayload($log))->values()->all(),
            'today_minutes' => $todayMinutes,
            'today_hours' => round($todayMinutes / 60, 2),
            'today_attendance' => $todayAttendance,
            'lunch_break' => LunchBreak::toStatusPayload(),
            'lunch_notice' => $this->lunchAutoTimeoutService->currentNotice($student, $justApplied),
            'geofence' => $this->companyGeofenceGuard->statusPayload($student),
        ];
    }

    /**
     * @return array{logs: list<array<string, mixed>>, total_count: int}
     */
    public function history(Student $student, int $limit = 60): array
    {
        $this->lunchAutoTimeoutService->applyIfNeeded($student);

        $logs = $student->timeLogs()
            ->orderByDesc('time_in')
            ->limit($limit)
            ->get()
            ->map(fn (TimeLog $log) => $this->logPayload($log))
            ->values()
            ->all();

        return [
            'logs' => $logs,
            'total_count' => $student->timeLogs()->count(),
        ];
    }

    /**
     * @param  list<float>  $embedding
     * @return array{message: string, profile: array<string, mixed>}
     */
    public function enrollFace(Student $student, array $embedding): array
    {
        $descriptor = FaceEmbedding::normalize($embedding);

        $profile = StudentFaceProfile::query()->updateOrCreate(
            ['student_id' => $student->id],
            [
                'reference_image_path' => 'embedded/on-device',
                'face_embedding' => $descriptor,
                'enrolled_at' => now(),
                'is_active' => true,
            ],
        );

        return [
            'message' => 'Face enrolled successfully. You can now time in and out.',
            'profile' => [
                'enrolled_at' => $profile->enrolled_at->toIso8601String(),
                'is_active' => $profile->is_active,
                'model' => 'faceapi-128-v1',
            ],
        ];
    }

    /**
     * @param  list<float>  $embedding
     * @return array{message: string, log: array<string, mixed>, match_distance: float}
     */
    public function punch(
        Student $student,
        string $action,
        array $embedding,
        ?string $deviceInfo = null,
        ?float $latitude = null,
        ?float $longitude = null,
        ?float $locationAccuracyMeters = null,
    ): array {
        $this->lunchAutoTimeoutService->applyIfNeeded($student);

        $this->companyGeofenceGuard->assertPunchAllowed(
            $student,
            $latitude,
            $longitude,
            $locationAccuracyMeters,
        );

        $faceProfile = $student->faceProfile()
            ->where('is_active', true)
            ->first();

        if ($faceProfile === null || ! is_array($faceProfile->face_embedding)) {
            throw ValidationException::withMessages([
                'embedding' => ['Enroll your face before timing in or out.'],
            ]);
        }

        $scanned = FaceEmbedding::normalize($embedding);
        $distance = FaceMatcher::euclideanDistance($faceProfile->face_embedding, $scanned);

        if (! FaceMatcher::matches($faceProfile->face_embedding, $scanned)) {
            throw ValidationException::withMessages([
                'embedding' => ['Face did not match your enrolled profile. Try again with better lighting.'],
            ]);
        }

        if ($action === 'time_in') {
            $result = $this->punchIn($student, $distance, $deviceInfo);
        } else {
            $result = $this->punchOut($student, $distance, $deviceInfo);
        }

        $result['match_distance'] = round($distance, 4);

        return $result;
    }

    /**
     * @return array{message: string, log: array<string, mixed>}
     */
    private function punchIn(Student $student, float $distance, ?string $deviceInfo): array
    {
        if ($this->openTimeLog($student) !== null) {
            throw ValidationException::withMessages([
                'action' => ['You already have an open time session. Time out first.'],
            ]);
        }

        if (LunchBreak::isWithinLunchBreakWindow(now())) {
            throw ValidationException::withMessages([
                'action' => [
                    sprintf(
                        'You can time in again at %s after lunch.',
                        LunchBreak::afternoonStartLabel(),
                    ),
                ],
            ]);
        }

        $isFirstPunch = ! $student->timeLogs()->exists();
        $timeIn = now();

        $log = TimeLog::query()->create([
            'student_id' => $student->id,
            'session_period' => TimeLogTaskPhotoService::resolveSessionPeriod($timeIn),
            'time_in' => $timeIn,
            'verification_method' => 'facial_recognition_embedded',
            'face_match_score' => $distance,
            'device_info' => $deviceInfo,
        ]);

        if ($isFirstPunch) {
            OjtSchedulePersister::ensureFromFirstTimeIn($student, $timeIn);
        }

        return [
            'message' => 'Timed in successfully.',
            'log' => $this->logPayload($log),
        ];
    }

    /**
     * @return array{message: string, log: array<string, mixed>}
     */
    private function punchOut(Student $student, float $distance, ?string $deviceInfo): array
    {
        $openLog = $this->openTimeLog($student);

        if ($openLog === null) {
            throw ValidationException::withMessages([
                'action' => ['No open time session found. Time in first.'],
            ]);
        }

        $this->timeLogTaskPhotoService->assertHasDraftPhotos($openLog);

        $timeOut = now();
        $durationMinutes = (int) $openLog->time_in->diffInMinutes($timeOut);

        $this->timeLogTaskPhotoService->finalizeForLog($openLog);

        $openLog->update([
            'time_out' => $timeOut,
            'duration_minutes' => $durationMinutes,
            'face_match_score' => $distance,
            'device_info' => $deviceInfo ?? $openLog->device_info,
        ]);

        $openLog->refresh();

        return [
            'message' => 'Timed out successfully.',
            'log' => $this->logPayload($openLog),
        ];
    }

    private function openTimeLog(Student $student): ?TimeLog
    {
        return $student->timeLogs()
            ->whereNull('time_out')
            ->orderByDesc('time_in')
            ->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function logPayload(TimeLog $log): array
    {
        $durationMinutes = $log->duration_minutes;

        if ($durationMinutes === null && $log->time_out === null) {
            $durationMinutes = (int) $log->time_in->diffInMinutes(now());
        }

        $payload = [
            'id' => $log->id,
            'session_period' => $log->session_period,
            'time_in' => $log->time_in->toIso8601String(),
            'time_out' => $log->time_out?->toIso8601String(),
            'duration_minutes' => $durationMinutes,
            'duration_hours' => $durationMinutes !== null
                ? round($durationMinutes / 60, 2)
                : null,
            'verification_method' => $log->verification_method,
            'face_match_score' => $log->face_match_score !== null
                ? (float) $log->face_match_score
                : null,
            'is_open' => $log->time_out === null,
            'is_auto_lunch' => $log->verification_method === 'auto_lunch_timeout',
            'submitted_task_photos_count' => $this->timeLogTaskPhotoService->submittedCount($log),
        ];

        if ($log->time_out === null) {
            $payload['task_photos'] = $this->timeLogTaskPhotoService->draftPhotosPayload($log, true);
            $payload['task_photos_count'] = count($payload['task_photos']);
        }

        return $payload;
    }
}
