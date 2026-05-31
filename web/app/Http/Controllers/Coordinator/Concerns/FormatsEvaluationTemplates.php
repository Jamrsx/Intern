<?php

namespace App\Http\Controllers\Coordinator\Concerns;

use App\Models\OjtEvaluationTemplate;
use App\Models\Section;

trait FormatsEvaluationTemplates
{
    /**
     * @return list<array<string, mixed>>
     */
    protected function evaluationTemplateOptions(?Section $section): array
    {
        if ($section === null) {
            return [];
        }

        return OjtEvaluationTemplate::query()
            ->where('section_id', $section->id)
            ->where('is_active', true)
            ->withCount('items')
            ->orderBy('name')
            ->get()
            ->map(fn (OjtEvaluationTemplate $template) => [
                'id' => $template->id,
                'name' => $template->name,
                'description' => $template->description,
                'items_count' => $template->items_count,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    protected function evaluationTemplatePayload(OjtEvaluationTemplate $template): array
    {
        $template->loadMissing('items');

        return [
            'id' => $template->id,
            'name' => $template->name,
            'description' => $template->description,
            'is_active' => $template->is_active,
            'has_been_used' => $template->hasBeenUsed(),
            'items_count' => $template->items->count(),
            'items' => $template->items->map(fn ($item) => [
                'id' => $item->id,
                'sort_order' => $item->sort_order,
                'item_type' => $item->item_type,
                'label' => $item->label,
                'is_required' => $item->is_required,
            ])->values()->all(),
        ];
    }

    protected function ensureTemplateBelongsToSection(
        OjtEvaluationTemplate $template,
        Section $section,
    ): void {
        abort_unless($template->section_id === $section->id, 404);
    }
}
