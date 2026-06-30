<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class JustifyOjtAbsenceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:10', 'max:2000'],
            'proof' => [
                'nullable',
                'file',
                'image',
                'mimes:jpeg,jpg,png,webp,heic,heif',
                'max:5120',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => 'Please explain why you were absent.',
            'reason.min' => 'Your reason must be at least 10 characters.',
            'proof.image' => 'Proof must be an image file.',
            'proof.max' => 'Proof image must be 5 MB or smaller.',
        ];
    }
}
