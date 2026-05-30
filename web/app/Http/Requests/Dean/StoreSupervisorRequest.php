<?php

namespace App\Http\Requests\Dean;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSupervisorRequest extends FormRequest
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
        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
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
