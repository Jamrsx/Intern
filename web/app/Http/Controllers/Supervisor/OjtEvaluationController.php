<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Supervisor\SubmitOjtEvaluationRequest;
use App\Models\OjtEvaluation;
use App\Models\Supervisor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OjtEvaluationController extends Controller
{
    public function show(Request $request, OjtEvaluation $evaluation): Response|RedirectResponse
    {
        $user = $request->user()?->loadMissing('role');

        abort_unless($user !== null && $user->hasRole('supervisor'), 403);

        $supervisor = Supervisor::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->first();

        abort_unless(
            $supervisor !== null && $evaluation->supervisor_id === $supervisor->id,
            403,
        );

        if ($evaluation->status !== OjtEvaluation::STATUS_PENDING) {
            Inertia::flash('toast', [
                'type' => 'info',
                'message' => 'This evaluation has already been submitted.',
            ]);

            return redirect()->route('supervisors.dashboard');
        }

        $evaluation->loadMissing([
            'student.section.course:id,code,name',
            'student.section.schoolYear:id,name',
            'template.items',
        ]);

        $student = $evaluation->student;

        return Inertia::render('supervisor/evaluations/show', [
            'evaluation' => [
                'id' => $evaluation->id,
                'opened_at' => $evaluation->opened_at->toIso8601String(),
                'template' => $evaluation->template ? [
                    'id' => $evaluation->template->id,
                    'name' => $evaluation->template->name,
                    'description' => $evaluation->template->description,
                    'items' => $evaluation->template->items->map(fn ($item) => [
                        'id' => $item->id,
                        'item_type' => $item->item_type,
                        'label' => $item->label,
                        'is_required' => $item->is_required,
                    ])->values()->all(),
                ] : null,
            ],
            'intern' => [
                'id' => $student->id,
                'full_name' => $student->fullName(),
                'student_number' => $student->student_number,
                'section' => $student->section ? [
                    'display_name' => trim(
                        ($student->section->course?->code ?? '').' '.$student->section->name
                    ),
                    'school_year' => $student->section->schoolYear?->name,
                ] : null,
            ],
        ]);
    }

    public function update(SubmitOjtEvaluationRequest $request, OjtEvaluation $evaluation): RedirectResponse
    {
        $evaluation->loadMissing('template.items');

        $normalizedResponses = collect($request->validated('responses'))
            ->map(function (array $response) use ($evaluation) {
                $item = $evaluation->template?->items->firstWhere('id', $response['item_id']);

                if ($item === null) {
                    return null;
                }

                if ($item->item_type === 'rating_question') {
                    return [
                        'item_id' => $item->id,
                        'item_type' => $item->item_type,
                        'label' => $item->label,
                        'rating' => (int) $response['rating'],
                    ];
                }

                return [
                    'item_id' => $item->id,
                    'item_type' => $item->item_type,
                    'label' => $item->label,
                    'text' => trim((string) ($response['text'] ?? '')),
                ];
            })
            ->filter()
            ->values()
            ->all();

        $ratingValues = collect($normalizedResponses)
            ->where('item_type', 'rating_question')
            ->pluck('rating')
            ->filter()
            ->all();

        $averageRating = count($ratingValues) > 0
            ? (int) round(array_sum($ratingValues) / count($ratingValues))
            : null;

        $textSummary = collect($normalizedResponses)
            ->where('item_type', 'text_area')
            ->map(fn (array $response) => "{$response['label']}: {$response['text']}")
            ->implode("\n\n");

        $evaluation->update([
            'rating' => $averageRating,
            'comments' => $textSummary !== '' ? $textSummary : null,
            'responses' => $normalizedResponses,
            'evaluation_date' => $request->validated('evaluation_date'),
            'status' => OjtEvaluation::STATUS_COMPLETED,
            'submitted_at' => now(),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Evaluation submitted successfully.',
        ]);

        return redirect()->route('supervisors.dashboard');
    }
}
