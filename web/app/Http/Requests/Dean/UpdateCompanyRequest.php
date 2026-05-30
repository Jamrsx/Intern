<?php

namespace App\Http\Requests\Dean;

use App\Models\Company;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! ($this->user()?->hasRole('dean') ?? false)) {
            return false;
        }

        $courseId = $this->user()?->courseAsDean?->id;
        $company = $this->route('company');

        if (! $company instanceof Company || $courseId === null) {
            return false;
        }

        return $company->course_id === $courseId;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        /** @var Company $company */
        $company = $this->route('company');

        return [
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('companies', 'name')
                    ->where('course_id', $company->course_id)
                    ->ignore($company->id),
            ],
            'address' => ['nullable', 'string', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.unique' => 'This company name is already registered for your course.',
        ];
    }
}
