<?php

namespace App\Services;

use App\Models\OjtAbsence;
use App\Models\Student;
use App\Models\TimeLog;
use App\Support\OjtWorkDayCalendar;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

class OjtAbsenceSyncService
{
    public function syncForStudent(Student $student): void
    {
        $schedule = $student->ojtSchedule;

        if ($schedule === null || $schedule->start_date === null) {
            return;
        }

        $daysPerWeek = (int) $schedule->days_per_week;
        $startDate = Carbon::parse($schedule->start_date)->startOfDay();
        $now = now();

        /** @var array<string, true> $datesWithTimeIn */
        $datesWithTimeIn = $student->timeLogs()
            ->where('time_in', '>=', $startDate)
            ->get()
            ->mapWithKeys(fn (TimeLog $log) => [
                $log->time_in->toDateString() => true,
            ])
            ->all();

        $cursor = $startDate->copy();
        $endDate = $now->copy()->startOfDay();

        while ($cursor->lte($endDate)) {
            if (! OjtWorkDayCalendar::isScheduledWeekday($daysPerWeek, $cursor)) {
                $this->removeAbsenceOnDate($student, $cursor);
                $cursor = $cursor->copy()->addDay();

                continue;
            }

            $dateKey = $cursor->toDateString();
            $isToday = $cursor->isSameDay($now);

            if ($isToday && ! OjtWorkDayCalendar::isAbsenceCutoffReached($now)) {
                $this->removeAbsenceOnDate($student, $cursor);
                $cursor = $cursor->copy()->addDay();

                continue;
            }

            if (isset($datesWithTimeIn[$dateKey])) {
                $this->removeAbsenceOnDate($student, $cursor);
            } else {
                OjtAbsence::query()->firstOrCreate(
                    [
                        'student_id' => $student->id,
                        'absence_date' => $dateKey,
                    ],
                    [
                        'status' => OjtAbsence::STATUS_DETECTED,
                    ],
                );
            }

            $cursor = $cursor->copy()->addDay();
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function todayAttendancePayload(Student $student): array
    {
        $this->syncForStudent($student);

        $schedule = $student->ojtSchedule;
        $today = now()->startOfDay();
        $todayMinutes = $this->minutesRenderedOnDate($student, $today);

        if ($schedule === null || $schedule->start_date === null) {
            return [
                'status' => 'not_started',
                'label' => 'OJT not started',
                'minutes' => $todayMinutes,
                'hours' => round($todayMinutes / 60, 2),
                'is_scheduled_today' => false,
                'schedule_label' => null,
                'absence_id' => null,
                'needs_justification' => false,
            ];
        }

        if ($today->lt(Carbon::parse($schedule->start_date)->startOfDay())) {
            return [
                'status' => 'not_started',
                'label' => 'OJT not started',
                'minutes' => 0,
                'hours' => 0,
                'is_scheduled_today' => false,
                'schedule_label' => OjtWorkDayCalendar::scheduleLabel((int) $schedule->days_per_week),
                'absence_id' => null,
                'needs_justification' => false,
            ];
        }

        $daysPerWeek = (int) $schedule->days_per_week;
        $isScheduledToday = OjtWorkDayCalendar::isScheduledWeekday($daysPerWeek, $today);
        $scheduleLabel = OjtWorkDayCalendar::scheduleLabel($daysPerWeek);

        if (! $isScheduledToday) {
            return [
                'status' => 'off_schedule',
                'label' => 'No OJT today',
                'minutes' => $todayMinutes,
                'hours' => round($todayMinutes / 60, 2),
                'is_scheduled_today' => false,
                'schedule_label' => $scheduleLabel,
                'absence_id' => null,
                'needs_justification' => false,
            ];
        }

        if ($todayMinutes > 0) {
            return [
                'status' => 'present',
                'label' => 'Present',
                'minutes' => $todayMinutes,
                'hours' => round($todayMinutes / 60, 2),
                'is_scheduled_today' => true,
                'schedule_label' => $scheduleLabel,
                'absence_id' => null,
                'needs_justification' => false,
            ];
        }

        if (! OjtWorkDayCalendar::isAbsenceCutoffReached(now())) {
            return [
                'status' => 'pending',
                'label' => 'Not timed in yet',
                'minutes' => 0,
                'hours' => 0,
                'is_scheduled_today' => true,
                'schedule_label' => $scheduleLabel,
                'absence_id' => null,
                'needs_justification' => false,
            ];
        }

        $absence = OjtAbsence::query()
            ->where('student_id', $student->id)
            ->whereDate('absence_date', $today)
            ->first();

        return [
            'status' => 'absent',
            'label' => 'Absent',
            'minutes' => 0,
            'hours' => 0,
            'is_scheduled_today' => true,
            'schedule_label' => $scheduleLabel,
            'absence_id' => $absence?->id,
            'needs_justification' => $absence?->needsJustification() ?? false,
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function absencesPayload(Student $student, int $limit = 60): array
    {
        $this->syncForStudent($student);

        return OjtAbsence::query()
            ->where('student_id', $student->id)
            ->orderByDesc('absence_date')
            ->limit($limit)
            ->get()
            ->map(fn (OjtAbsence $absence) => $this->absencePayload($absence))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function absencePayload(OjtAbsence $absence, ?callable $proofUrlResolver = null): array
    {
        return [
            'id' => $absence->id,
            'absence_date' => $absence->absence_date->toDateString(),
            'date_label' => $absence->absence_date->format('F j, Y'),
            'status' => $absence->status,
            'reason' => $absence->reason,
            'has_proof' => $absence->proof_file_path !== null,
            'proof_url' => $absence->proof_file_path && $proofUrlResolver
                ? $proofUrlResolver($absence)
                : null,
            'justification_submitted_at' => $absence->justification_submitted_at?->toIso8601String(),
            'needs_justification' => $absence->needsJustification(),
            'rendered_hours' => 0,
            'rendered_minutes' => 0,
        ];
    }

    public function minutesRenderedOnDate(Student $student, CarbonInterface $date): int
    {
        $dayStart = $date->copy()->startOfDay();
        $dayEnd = $date->copy()->endOfDay();

        $logs = $student->timeLogs()
            ->whereBetween('time_in', [$dayStart, $dayEnd])
            ->get();

        $minutes = 0;

        foreach ($logs as $log) {
            if ($log->duration_minutes !== null) {
                $minutes += (int) $log->duration_minutes;

                continue;
            }

            if ($log->time_out !== null) {
                $minutes += (int) $log->time_in->diffInMinutes($log->time_out);
            } elseif ($log->time_in->isSameDay(now())) {
                $minutes += (int) $log->time_in->diffInMinutes(now());
            }
        }

        return $minutes;
    }

    private function removeAbsenceOnDate(Student $student, CarbonInterface $date): void
    {
        OjtAbsence::query()
            ->where('student_id', $student->id)
            ->whereDate('absence_date', $date->toDateString())
            ->delete();
    }
}
