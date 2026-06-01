<?php

namespace App\Http\Requests\Api;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreInternDocumentRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:2', 'max:255'],
            'file' => [
                'required',
                'file',
                'mimes:pdf,doc,docx',
                'max:10240',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'Please enter a report name (e.g. MOA, Week 1).',
            'file.required' => 'Please choose a PDF or Word file to upload.',
            'file.mimes' => 'Only PDF and Word (.doc, .docx) files are allowed.',
            'file.max' => 'The file may not be larger than 10 MB.',
        ];
    }
}
