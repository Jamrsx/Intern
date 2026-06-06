<?php

namespace App\Services;

use App\Models\Student;
use App\Models\TimeLog;
use App\Support\LunchBreak;

class LunchAutoTimeoutService
{
    /**
     * @return array<string, mixed>|null
     */
    public function applyIfNeeded(Student $student): ?array
    {
        $openLog = $this->openTimeLog($student);

        if ($openLog === null) {
            return null;
        }

        $now = now();

        if (! $openLog->time_in->isSameDay($now)) {
            return null;
        }

        $lunchAt = LunchBreak::lunchAt($openLog->time_in);

        if ($openLog->time_in->gte($lunchAt) || $now->lt($lunchAt)) {
            return null;
        }

        $durationMinutes = (int) $openLog->time_in->diffInMinutes($lunchAt);

        $openLog->update([
            'time_out' => $lunchAt,
            'duration_minutes' => $durationMinutes,
            'verification_method' => 'auto_lunch_timeout',
            'device_info' => 'auto_lunch',
        ]);

        return $this->noticePayload(
            'auto_lunch_timeout',
            sprintf(
                'You were automatically timed out at %s for lunch. Time in again at %s.',
                LunchBreak::lunchTimeLabel(),
                LunchBreak::afternoonStartLabel(),
            ),
            $now->gte(LunchBreak::afternoonStartAt($now)),
        );
    }

    /**
     * @return array<string, mixed>|null
     */
    public function currentNotice(Student $student, ?array $justApplied = null): ?array
    {
        if ($justApplied !== null) {
            return $justApplied;
        }

        $now = now();

        if (LunchBreak::isWithinLunchBreakWindow($now)) {
            return $this->noticePayload(
                'lunch_break_window',
                sprintf(
                    'You are on lunch break. Time in again at %s.',
                    LunchBreak::afternoonStartLabel(),
                ),
                false,
            );
        }

        $autoClosedToday = $student->timeLogs()
            ->where('time_in', '>=', $now->copy()->startOfDay())
            ->where('verification_method', 'auto_lunch_timeout')
            ->exists();

        if (! $autoClosedToday || $this->openTimeLog($student) !== null) {
            return null;
        }

        return $this->noticePayload(
            'auto_lunch_timeout',
            sprintf(
                'You were automatically timed out at %s for lunch. Time in again at %s.',
                LunchBreak::lunchTimeLabel(),
                LunchBreak::afternoonStartLabel(),
            ),
            $now->gte(LunchBreak::afternoonStartAt($now)),
        );
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
    private function noticePayload(
        string $type,
        string $message,
        bool $canTimeInNow,
    ): array {
        return [
            'type' => $type,
            'message' => $message,
            'can_time_in_now' => $canTimeInNow,
        ];
    }
}
