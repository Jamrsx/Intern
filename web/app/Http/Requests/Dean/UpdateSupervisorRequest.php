<?php

namespace App\Http\Requests\Dean;

use App\Models\Supervisor;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSupervisorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('dean') ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        /** @var Supervisor $supervisor */
        $supervisor = $this->route('supervisor');

        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($supervisor->user_id),
            ],
            'company_id' => [
                'required',
                'integer',
                Rule::exists('companies', 'id')->where('is_active', true),
            ],
            'department_id' => [
                'nullable',
                'integer',
                Rule::exists('departments', 'id')->where(function ($query) {
                    if ($this->filled('company_id')) {
                        $query->where('company_id', $this->input('company_id'))
                            ->where('is_active', true);
                    }
                }),
            ],
            'position_title' => ['nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.unique' => 'This email is already registered.',
            'department_id.exists' => 'Please select a valid department for the chosen company.',
        ];
    }
}
