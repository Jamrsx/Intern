<?php

namespace App\Support;

use App\Models\OjtAbsence;
use App\Models\Student;
use App\Services\OjtAbsenceSyncService;

class StudentAttendanceJournal
{
    /**
     * @param  callable(OjtAbsence): (string|null)  $proofUrlResolver
     * @return list<array<string, mixed>>
     */
    public static function forStudent(
        Student $student,
        callable $proofUrlResolver,
        ?OjtAbsenceSyncService $syncService = null,
    ): array {
        $syncService ??= app(OjtAbsenceSyncService::class);

        $schedule = $student->ojtSchedule;
        $scheduleLabel = $schedule
            ? OjtWorkDayCalendar::scheduleLabel((int) $schedule->days_per_week)
            : null;

        $absences = OjtAbsence::query()
            ->where('student_id', $student->id)
            ->orderByDesc('absence_date')
            ->get();

        $today = now()->startOfDay();
        $todayMinutes = $syncService->minutesRenderedOnDate($student, $today);
        $todayAttendance = $syncService->todayAttendancePayload($student);

        $entries = $absences
            ->map(function (OjtAbsence $absence) use ($syncService, $student, $proofUrlResolver) {
                return [
                    'date' => $absence->absence_date->toDateString(),
                    'date_label' => $absence->absence_date->format('F j, Y'),
                    'status' => 'absent',
                    'status_label' => $absence->isJustified() ? 'Absent (justified)' : 'Absent',
                    'rendered_hours' => 0,
                    'rendered_minutes' => 0,
                    'absence_id' => $absence->id,
                    'reason' => $absence->reason,
                    'has_proof' => $absence->proof_file_path !== null,
                    'proof_url' => $absence->proof_file_path
                        ? $proofUrlResolver($absence)
                        : null,
                    'justification_submitted_at' => $absence->justification_submitted_at?->toIso8601String(),
                ];
            })
            ->values()
            ->all();

        return [
            'schedule_label' => $scheduleLabel,
            'days_per_week' => $schedule?->days_per_week,
            'today' => [
                'date' => $today->toDateString(),
                'date_label' => $today->format('F j, Y'),
                'status' => $todayAttendance['status'],
                'status_label' => $todayAttendance['label'],
                'rendered_hours' => $todayAttendance['hours'],
                'rendered_minutes' => $todayMinutes,
            ],
            'absences' => $entries,
            'absence_count' => count($entries),
            'pending_justification_count' => $absences->where('status', OjtAbsence::STATUS_DETECTED)->count(),
        ];
    }
}
