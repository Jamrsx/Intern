<?php

namespace App\Http\Requests\Api;

use App\Support\FaceEmbedding;
use Illuminate\Foundation\Http\FormRequest;

class EnrollInternFaceRequest extends FormRequest
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
        return FaceEmbedding::rules('embedding');
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'embedding.required' => 'Face enrollment data is required.',
            'embedding.size' => 'Face enrollment must be a 128-D embedding from the mobile app.',
            'embedding.*.numeric' => 'Face enrollment embedding must contain numbers only.',
        ];
    }
}
