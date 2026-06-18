<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Coordinator\Concerns\FormatsEvaluationTemplates;
use App\Http\Controllers\Coordinator\Concerns\ResolvesCoordinatorCourse;
use App\Http\Requests\Coordinator\StoreEvaluationTemplateRequest;
use App\Http\Requests\Coordinator\UpdateEvaluationTemplateRequest;
use App\Models\OjtEvaluationTemplate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class EvaluationTemplateController extends Controller
{
    use FormatsEvaluationTemplates;
    use ResolvesCoordinatorCourse;

    public function index(Request $request): Response
    {
        $section = $this->coordinatorSection($request);

        $templates = $section === null
            ? []
            : OjtEvaluationTemplate::query()
                ->where('section_id', $section->id)
                ->withCount('items')
                ->orderBy('name')
                ->get()
                ->map(fn (OjtEvaluationTemplate $template) => [
                    'id' => $template->id,
                    'name' => $template->name,
                    'description' => $template->description,
                    'is_active' => $template->is_active,
                    'items_count' => $template->items_count,
                    'has_been_used' => $template->hasBeenUsed(),
                ])
                ->values()
                ->all();

        return Inertia::render('coordinator/evaluation-templates', [
            'section' => $this->coordinatorSectionPayload($section),
            'templates' => $templates,
        ]);
    }

    public function create(Request $request): Response
    {
        $section = $this->coordinatorSectionOrFail($request);

        return Inertia::render('coordinator/evaluation-templates/create', [
            'section' => [
                'id' => $section->id,
                'display_name' => trim(
                    ($section->course?->code ?? '').' '.$section->name
                ),
            ],
        ]);
    }

    public function edit(
        Request $request,
        OjtEvaluationTemplate $evaluationTemplate,
    ): Response {
        $section = $this->coordinatorSectionOrFail($request);
        $this->ensureTemplateBelongsToSection($evaluationTemplate, $section);

        abort_if(
            $evaluationTemplate->hasBeenUsed(),
            422,
            'This evaluation sheet has already been sent and cannot be edited. Create a new sheet instead.',
        );

        return Inertia::render('coordinator/evaluation-templates/edit', [
            'section' => [
                'id' => $section->id,
                'display_name' => trim(
                    ($section->course?->code ?? '').' '.$section->name
                ),
            ],
            'template' => $this->evaluationTemplatePayload($evaluationTemplate),
        ]);
    }

    public function store(StoreEvaluationTemplateRequest $request): RedirectResponse
    {
        $section = $this->coordinatorSectionOrFail($request);
        $validated = $request->validated();

        DB::transaction(function () use ($request, $section, $validated): void {
            $template = OjtEvaluationTemplate::query()->create([
                'section_id' => $section->id,
                'created_by_user_id' => $request->user()->id,
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'is_active' => true,
            ]);

            foreach ($validated['items'] as $index => $itemData) {
                $template->items()->create([
                    'sort_order' => $index,
                    'item_type' => $itemData['item_type'],
                    'label' => $itemData['label'],
                    'is_required' => (bool) ($itemData['is_required'] ?? true),
                ]);
            }
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Evaluation sheet created successfully.',
        ]);

        return redirect()->route('coordinators.evaluation-templates.index');
    }

    public function update(
        UpdateEvaluationTemplateRequest $request,
        OjtEvaluationTemplate $evaluationTemplate,
    ): RedirectResponse {
        $section = $this->coordinatorSectionOrFail($request);
        $this->ensureTemplateBelongsToSection($evaluationTemplate, $section);

        abort_if(
            $evaluationTemplate->hasBeenUsed(),
            422,
            'This evaluation sheet has already been sent and cannot be edited. Create a new sheet instead.',
        );

        $validated = $request->validated();

        DB::transaction(function () use ($request, $evaluationTemplate, $validated): void {
            $evaluationTemplate->update([
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'is_active' => $request->boolean('is_active', $evaluationTemplate->is_active),
            ]);

            $evaluationTemplate->items()->delete();

            foreach ($validated['items'] as $index => $itemData) {
                $evaluationTemplate->items()->create([
                    'sort_order' => $index,
                    'item_type' => $itemData['item_type'],
                    'label' => $itemData['label'],
                    'is_required' => (bool) ($itemData['is_required'] ?? true),
                ]);
            }
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Evaluation sheet updated successfully.',
        ]);

        return redirect()->route('coordinators.evaluation-templates.index');
    }

    public function destroy(
        Request $request,
        OjtEvaluationTemplate $evaluationTemplate,
    ): RedirectResponse {
        $section = $this->coordinatorSectionOrFail($request);
        $this->ensureTemplateBelongsToSection($evaluationTemplate, $section);

        if (
            $evaluationTemplate->evaluations()
                ->where('status', 'pending')
                ->exists()
        ) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Cannot deactivate a sheet that has pending evaluations.',
            ]);

            return redirect()->route('coordinators.evaluation-templates.index');
        }

        $evaluationTemplate->update(['is_active' => false]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Evaluation sheet deactivated.',
        ]);

        return redirect()->route('coordinators.evaluation-templates.index');
    }
}
