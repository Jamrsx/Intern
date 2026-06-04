<?php

namespace App\Http\Requests\Api;

use App\Support\FaceEmbedding;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PunchInternTimeRequest extends FormRequest
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
            'action' => ['required', Rule::in(['time_in', 'time_out'])],
            'device_info' => ['nullable', 'string', 'max:500'],
            ...FaceEmbedding::rules('embedding'),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'action.required' => 'Specify whether you are timing in or out.',
            'action.in' => 'Action must be time_in or time_out.',
            'embedding.required' => 'Face verification data is required.',
            'embedding.size' => 'Face verification must be a 128-D embedding from the mobile app.',
            'embedding.*.numeric' => 'Face verification embedding must contain numbers only.',
        ];
    }
}
