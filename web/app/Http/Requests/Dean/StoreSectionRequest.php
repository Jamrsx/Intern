<?php

namespace App\Http\Requests\Dean;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ($this->user()?->hasRole('dean') ?? false)
            && $this->user()?->courseAsDean !== null;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $courseId = $this->user()?->courseAsDean?->id;

        return [
            'school_year_id' => [
                'required',
                'integer',
                Rule::exists('school_years', 'id')->where('is_active', true),
            ],
            'name' => [
                'required',
                'string',
                'max:50',
                Rule::unique('sections', 'name')
                    ->where(fn ($query) => $query
                        ->where('course_id', $courseId)
                        ->where('school_year_id', $this->input('school_year_id'))),
            ],
            'code' => ['nullable', 'string', 'max:20'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.unique' => 'This section name already exists for the selected school year.',
            'school_year_id.exists' => 'Please select an active school year.',
        ];
    }
}
