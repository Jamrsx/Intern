<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreTimeLogTaskPhotoRequest extends FormRequest
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
            'file' => [
                'required',
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
            'file.required' => 'Choose a photo of your current task.',
            'file.image' => 'Task photos must be image files.',
            'file.mimes' => 'Use JPEG, PNG, or WebP photos.',
            'file.max' => 'Each task photo must be 5 MB or smaller.',
        ];
    }
}
