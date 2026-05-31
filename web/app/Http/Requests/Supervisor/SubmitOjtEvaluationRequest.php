<?php

namespace App\Http\Requests\Supervisor;

use App\Models\OjtEvaluation;
use App\Models\Supervisor;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SubmitOjtEvaluationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user()?->loadMissing('role');

        if ($user === null || ! $user->hasRole('supervisor')) {
            return false;
        }

        /** @var OjtEvaluation $evaluation */
        $evaluation = $this->route('evaluation');

        if ($evaluation->status !== OjtEvaluation::STATUS_PENDING) {
            return false;
        }

        $supervisor = Supervisor::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->first();

        return $supervisor !== null && $evaluation->supervisor_id === $supervisor->id;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'evaluation_date' => ['required', 'date', 'before_or_equal:today'],
            'responses' => ['required', 'array', 'min:1'],
            'responses.*.item_id' => ['required', 'integer'],
            'responses.*.rating' => ['nullable', 'integer', Rule::in([1, 2, 3, 4, 5])],
            'responses.*.text' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var OjtEvaluation $evaluation */
            $evaluation = $this->route('evaluation');
            $evaluation->loadMissing('template.items');

            if ($evaluation->template === null) {
                $validator->errors()->add('responses', 'This evaluation sheet is no longer available.');

                return;
            }

            $items = $evaluation->template->items->keyBy('id');
            $responses = collect($this->input('responses', []));

            foreach ($items as $item) {
                $response = $responses->firstWhere('item_id', $item->id);

                if ($item->item_type === 'rating_question') {
                    if ($item->is_required && empty($response['rating'])) {
                        $validator->errors()->add(
                            'responses',
                            "Please rate: {$item->label}",
                        );
                    }

                    continue;
                }

                if ($item->item_type === 'text_area') {
                    $text = trim((string) ($response['text'] ?? ''));

                    if ($item->is_required && $text === '') {
                        $validator->errors()->add(
                            'responses',
                            "Please complete: {$item->label}",
                        );
                    }
                }
            }

            foreach ($responses as $response) {
                if (! $items->has($response['item_id'] ?? null)) {
                    $validator->errors()->add('responses', 'One or more answers are invalid.');
                }
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'evaluation_date.required' => 'Please provide the evaluation date.',
            'evaluation_date.before_or_equal' => 'Evaluation date cannot be in the future.',
            'responses.required' => 'Please complete the evaluation form.',
        ];
    }
}
