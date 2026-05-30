<?php

namespace App\Http\Requests\Dean;

use App\Models\Company;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDepartmentRequest extends FormRequest
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
                'max:100',
                Rule::unique('departments', 'name')->where('company_id', $company->id),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.unique' => 'This department already exists for the selected company.',
        ];
    }
}
