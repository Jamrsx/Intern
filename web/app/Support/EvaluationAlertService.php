<?php

namespace App\Support;

use App\Models\OjtEvaluation;
use App\Models\Section;
use App\Models\Student;
use App\Models\Supervisor;
use Carbon\CarbonInterface;
class EvaluationAlertService
{
    /**
     * @return array{
     *     pending_count: int,
     *     new_count: int,
     *     has_unread: bool,
     *     last_seen_at: string|null
     * }
     */
    public static function supervisorAlerts(Supervisor $supervisor): array
    {
        $lastSeenAt = $supervisor->evaluation_pending_alerts_seen_at;

        $pendingEvaluations = OjtEvaluation::query()
            ->where('supervisor_id', $supervisor->id)
            ->where('status', OjtEvaluation::STATUS_PENDING)
            ->get(['id', 'opened_at']);

        $newCount = $pendingEvaluations
            ->filter(fn (OjtEvaluation $evaluation) => self::isOpenedAfter(
                $evaluation->opened_at,
                $lastSeenAt,
            ))
            ->count();

        $pendingCount = $pendingEvaluations->count();

        return [
            'pending_count' => $pendingCount,
            'new_count' => $newCount,
            'has_unread' => $newCount > 0,
            'last_seen_at' => $lastSeenAt?->toIso8601String(),
        ];
    }

    /**
     * @return array{
     *     awaiting_supervisor: int,
     *     new_completed_count: int,
     *     has_unread: bool,
     *     last_seen_at: string|null
     * }
     */
    public static function coordinatorAlerts(Section $section): array
    {
        $lastSeenAt = $section->evaluation_completed_alerts_seen_at;

        $studentIds = Student::query()
            ->where('section_id', $section->id)
            ->where('is_active', true)
            ->pluck('id');

        $awaitingSupervisor = OjtEvaluation::query()
            ->whereIn('student_id', $studentIds)
            ->where('status', OjtEvaluation::STATUS_PENDING)
            ->count();

        $newCompletedCount = OjtEvaluation::query()
            ->whereIn('student_id', $studentIds)
            ->where('status', OjtEvaluation::STATUS_COMPLETED)
            ->when(
                $lastSeenAt !== null,
                fn ($query) => $query->where('submitted_at', '>', $lastSeenAt),
                fn ($query) => $query->whereNotNull('submitted_at'),
            )
            ->count();

        return [
            'awaiting_supervisor' => $awaitingSupervisor,
            'new_completed_count' => $newCompletedCount,
            'has_unread' => $newCompletedCount > 0,
            'last_seen_at' => $lastSeenAt?->toIso8601String(),
        ];
    }

    public static function isPendingEvaluationNew(
        OjtEvaluation $evaluation,
        ?CarbonInterface $lastSeenAt,
    ): bool {
        if ($evaluation->status !== OjtEvaluation::STATUS_PENDING) {
            return false;
        }

        return self::isOpenedAfter($evaluation->opened_at, $lastSeenAt);
    }

    public static function isCompletedEvaluationNew(
        OjtEvaluation $evaluation,
        ?CarbonInterface $lastSeenAt,
    ): bool {
        if (
            $evaluation->status !== OjtEvaluation::STATUS_COMPLETED
            || $evaluation->submitted_at === null
        ) {
            return false;
        }

        if ($lastSeenAt === null) {
            return true;
        }

        return $evaluation->submitted_at->greaterThan($lastSeenAt);
    }

    public static function markSupervisorPendingSeen(Supervisor $supervisor): void
    {
        $supervisor->update([
            'evaluation_pending_alerts_seen_at' => now(),
        ]);
    }

    public static function markCoordinatorCompletedSeen(Section $section): void
    {
        $section->update([
            'evaluation_completed_alerts_seen_at' => now(),
        ]);
    }

    private static function isOpenedAfter(
        ?CarbonInterface $openedAt,
        ?CarbonInterface $lastSeenAt,
    ): bool {
        if ($openedAt === null) {
            return false;
        }

        if ($lastSeenAt === null) {
            return true;
        }

        return $openedAt->greaterThan($lastSeenAt);
    }
}
