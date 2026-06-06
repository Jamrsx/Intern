<?php

namespace App\Http\Requests\Coordinator;

use App\Support\DocumentRequirementFileType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateDocumentRequirementRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:2', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'deadline_at' => ['required', 'date'],
            'accepted_file_types' => [
                'required',
                Rule::enum(DocumentRequirementFileType::class),
            ],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
