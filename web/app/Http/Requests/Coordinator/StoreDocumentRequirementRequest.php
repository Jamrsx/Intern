<?php

namespace App\Http\Requests\Coordinator;

use App\Support\DocumentRequirementFileType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDocumentRequirementRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:2', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'deadline_at' => ['required', 'date', 'after:now'],
            'accepted_file_types' => [
                'required',
                Rule::enum(DocumentRequirementFileType::class),
            ],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'deadline_at.after' => 'The deadline must be in the future.',
        ];
    }
}
