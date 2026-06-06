<?php

namespace App\Support;

use App\Models\OjtSchedule;
use App\Models\Student;
use App\Models\TimeLog;
use Illuminate\Support\Carbon;

class OjtProgressCalculator
{
    /**
     * @return array<string, mixed>
     */
    public static function forStudent(Student $student, int $requiredHours): array
    {
        $logs = TimeLog::query()
            ->where('student_id', $student->id)
            ->orderByDesc('time_in')
            ->get();

        $renderedMinutes = 0;

        foreach ($logs as $log) {
            if ($log->duration_minutes !== null) {
                $renderedMinutes += (int) $log->duration_minutes;

                continue;
            }

            if ($log->time_out !== null) {
                $renderedMinutes += (int) $log->time_in->diffInMinutes($log->time_out);
            }
        }

        $renderedHours = round($renderedMinutes / 60, 2);
        $remainingHours = round(max($requiredHours - $renderedHours, 0), 2);
        $percentComplete = $requiredHours > 0
            ? round(min(($renderedHours / $requiredHours) * 100, 100), 1)
            : 0.0;

        $schedule = OjtSchedule::query()
            ->where('student_id', $student->id)
            ->first();

        $estimatedEndDate = null;
        $estimatedEndIsApproximate = false;
        $estimatedEndBasis = null;

        if ($remainingHours <= 0) {
            $estimatedEndDate = Carbon::today()->toDateString();
            $estimatedEndBasis = 'completed';
        } else {
            $hoursPerDay = 8.0;
            $daysPerWeek = 5;

            if ($schedule !== null) {
                $hoursPerDay = (float) $schedule->hours_per_day;
                $daysPerWeek = (int) $schedule->days_per_week;
                $estimatedEndBasis = 'schedule';
            } else {
                $estimatedEndIsApproximate = true;
                $estimatedEndBasis = 'default_schedule';
            }

            $hoursPerWeek = $hoursPerDay * $daysPerWeek;

            if ($hoursPerWeek > 0) {
                $weeksRemaining = (int) ceil($remainingHours / $hoursPerWeek);
                $estimatedEndDate = Carbon::today()->addWeeks($weeksRemaining)->toDateString();

                if ($schedule === null) {
                    $estimatedEndIsApproximate = true;
                }
            }
        }

        return [
            'required_hours' => $requiredHours,
            'rendered_hours' => $renderedHours,
            'remaining_hours' => $remainingHours,
            'percent_complete' => $percentComplete,
            'time_log_count' => $logs->count(),
            'estimated_end_date' => $estimatedEndDate,
            'estimated_end_is_approximate' => $estimatedEndIsApproximate,
            'estimated_end_basis' => $estimatedEndBasis,
            'schedule' => $schedule ? [
                'hours_per_day' => (float) $schedule->hours_per_day,
                'days_per_week' => (int) $schedule->days_per_week,
                'start_date' => $schedule->start_date?->toDateString(),
            ] : null,
        ];
    }
}
