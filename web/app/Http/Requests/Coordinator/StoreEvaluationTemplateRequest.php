<?php

namespace App\Http\Requests\Coordinator;

use App\Http\Requests\Coordinator\Concerns\AuthorizesCoordinatorCourse;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEvaluationTemplateRequest extends FormRequest
{
    use AuthorizesCoordinatorCourse;

    public function authorize(): bool
    {
        return $this->isCoordinatorWithCourse();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $sectionId = $this->coordinatorSectionId();

        return [
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('ojt_evaluation_templates', 'name')->where('section_id', $sectionId),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1', 'max:30'],
            'items.*.item_type' => [
                'required',
                'string',
                Rule::in(['rating_question', 'text_area']),
            ],
            'items.*.label' => ['required', 'string', 'max:255'],
            'items.*.is_required' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.unique' => 'You already have an evaluation sheet with this name.',
            'items.required' => 'Add at least one question or text field.',
            'items.min' => 'Add at least one question or text field.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $items = collect($this->input('items', []))
            ->values()
            ->map(function (array $item, int $index) {
                $item['sort_order'] = $index;

                return $item;
            })
            ->all();

        $this->merge(['items' => $items]);
    }
}
