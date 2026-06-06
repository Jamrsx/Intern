<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DocumentRequirement;
use App\Models\Student;
use App\Models\StudentDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Carbon\CarbonInterface;

class InternDocumentRequirementController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('intern')) {
            abort(403, 'This endpoint is for intern accounts only.');
        }

        $student = Student::query()
            ->where('user_id', $user->id)
            ->firstOrFail();

        $lastSeenAt = $student->last_document_alerts_seen_at;

        $submittedRequirementIds = StudentDocument::query()
            ->where('student_id', $student->id)
            ->whereNotNull('document_requirement_id')
            ->pluck('document_requirement_id')
            ->all();

        $requirements = DocumentRequirement::query()
            ->where('section_id', $student->section_id)
            ->where('is_active', true)
            ->orderBy('deadline_at')
            ->get()
            ->map(function (DocumentRequirement $requirement) use (
                $submittedRequirementIds,
                $student,
                $lastSeenAt,
            ) {
                $isSubmitted = in_array(
                    $requirement->id,
                    $submittedRequirementIds,
                    true,
                );

                $submission = null;

                if ($isSubmitted) {
                    $submission = StudentDocument::query()
                        ->where('student_id', $student->id)
                        ->where('document_requirement_id', $requirement->id)
                        ->latest('uploaded_at')
                        ->first();
                }

                $status = $this->resolveStatus(
                    $requirement,
                    $isSubmitted,
                );

                $isNew = $this->isNewRequirement($requirement, $lastSeenAt);

                return [
                    'id' => $requirement->id,
                    'title' => $requirement->title,
                    'description' => $requirement->description,
                    'deadline_at' => $requirement->deadline_at->toIso8601String(),
                    'accepted_file_types' => $requirement->accepted_file_types->value,
                    'accepted_file_types_label' => $requirement->accepted_file_types->label(),
                    'accepted_file_types_hint' => $requirement->accepted_file_types->internHint(),
                    'published_at' => $requirement->created_at->toIso8601String(),
                    'status' => $status,
                    'is_submitted' => $isSubmitted,
                    'is_new' => $isNew,
                    'submission' => $submission ? [
                        'id' => $submission->id,
                        'original_filename' => $submission->original_filename,
                        'uploaded_at' => $submission->uploaded_at->toIso8601String(),
                    ] : null,
                ];
            })
            ->values()
            ->all();

        $pendingCount = collect($requirements)
            ->whereIn('status', ['pending', 'overdue'])
            ->count();

        $newCount = collect($requirements)->where('is_new', true)->count();

        $unreadCount = collect($requirements)
            ->where('is_submitted', false)
            ->count();

        $notifications = collect($requirements)
            ->filter(fn (array $item) => $item['is_new'] || in_array($item['status'], ['pending', 'overdue'], true))
            ->map(fn (array $item) => [
                'id' => $item['id'],
                'title' => $item['title'],
                'deadline_at' => $item['deadline_at'],
                'status' => $item['status'],
                'is_new' => $item['is_new'],
                'message' => $item['is_new']
                    ? "New required document: {$item['title']}"
                    : "Submit \"{$item['title']}\" before the deadline.",
            ])
            ->values()
            ->all();

        return response()->json([
            'requirements' => $requirements,
            'pending_count' => $pendingCount,
            'new_count' => $newCount,
            'unread_count' => $unreadCount,
            'notifications' => $notifications,
            'last_seen_at' => $lastSeenAt?->toIso8601String(),
            'server_time' => now()->toIso8601String(),
        ]);
    }

    public function markSeen(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('intern')) {
            abort(403, 'This endpoint is for intern accounts only.');
        }

        $student = Student::query()
            ->where('user_id', $user->id)
            ->firstOrFail();

        $student->update([
            'last_document_alerts_seen_at' => now(),
        ]);

        return response()->json([
            'message' => 'Document alerts marked as seen.',
            'last_seen_at' => $student->last_document_alerts_seen_at?->toIso8601String(),
        ]);
    }

    private function isNewRequirement(
        DocumentRequirement $requirement,
        ?CarbonInterface $lastSeenAt,
    ): bool {
        if ($lastSeenAt === null) {
            return true;
        }

        return $requirement->created_at->greaterThan($lastSeenAt);
    }

    private function resolveStatus(
        DocumentRequirement $requirement,
        bool $isSubmitted,
    ): string {
        if ($isSubmitted) {
            return 'submitted';
        }

        if ($requirement->deadline_at->isPast()) {
            return 'overdue';
        }

        return 'pending';
    }
}
