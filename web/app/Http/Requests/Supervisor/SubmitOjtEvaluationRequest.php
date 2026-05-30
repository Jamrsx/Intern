<?php

namespace App\Http\Requests\Supervisor;

use App\Models\OjtEvaluation;
use App\Models\Supervisor;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
            'rating' => ['required', 'integer', Rule::in([1, 2, 3, 4, 5])],
            'comments' => ['nullable', 'string', 'max:5000'],
            'evaluation_date' => ['required', 'date', 'before_or_equal:today'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'rating.required' => 'Please select a rating from 1 to 5.',
            'rating.in' => 'Rating must be between 1 and 5.',
            'evaluation_date.required' => 'Please provide the evaluation date.',
            'evaluation_date.before_or_equal' => 'Evaluation date cannot be in the future.',
        ];
    }
}
