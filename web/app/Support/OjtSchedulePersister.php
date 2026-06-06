<?php

namespace App\Support;

use App\Models\OjtSchedule;
use App\Models\Student;
use Carbon\CarbonInterface;

class OjtSchedulePersister
{
    /**
     * @return array<string, mixed>
     */
    private static function defaultAttributes(): array
    {
        return [
            'hours_per_day' => 8,
            'days_per_week' => 5,
        ];
    }

    public static function upsert(
        Student $student,
        float $hoursPerDay,
        int $daysPerWeek,
    ): OjtSchedule {
        $existing = OjtSchedule::query()->where('student_id', $student->id)->first();

        if ($existing !== null) {
            $existing->update([
                'hours_per_day' => round($hoursPerDay, 2),
                'days_per_week' => $daysPerWeek,
            ]);

            return $existing->refresh();
        }

        return OjtSchedule::query()->create([
            'student_id' => $student->id,
            'start_date' => null,
            ...self::defaultAttributes(),
            'hours_per_day' => round($hoursPerDay, 2),
            'days_per_week' => $daysPerWeek,
        ]);
    }

    public static function ensureFromFirstTimeIn(
        Student $student,
        CarbonInterface $timeInAt,
    ): OjtSchedule {
        $existing = OjtSchedule::query()->where('student_id', $student->id)->first();
        $startDate = $timeInAt->toDateString();

        if ($existing === null) {
            return OjtSchedule::query()->create([
                'student_id' => $student->id,
                'start_date' => $startDate,
                ...self::defaultAttributes(),
            ]);
        }

        if ($existing->start_date === null) {
            $existing->update(['start_date' => $startDate]);
            $existing->refresh();
        }

        return $existing;
    }
}
