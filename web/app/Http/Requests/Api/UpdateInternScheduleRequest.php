<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateInternScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('intern') ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'hours_per_day' => ['required', 'numeric', 'min:1', 'max:12'],
            'days_per_week' => ['required', 'integer', Rule::in([4, 5, 6])],
        ];
    }
}
