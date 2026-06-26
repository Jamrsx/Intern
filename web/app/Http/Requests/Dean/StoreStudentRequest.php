<?php

namespace App\Http\Requests\Dean;

use App\Concerns\AuthorizesDeanPortal;
use App\Support\DeanPortalScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStudentRequest extends FormRequest
{
    use AuthorizesDeanPortal;

    public function authorize(): bool
    {
        return $this->authorizedForDeanPortal();
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $scopedSectionIds = DeanPortalScope::sectionsQuery($this->user())
            ->where('is_active', true)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_active', true))
            ->pluck('id');

        return [
            'student_number' => [
                'required',
                'string',
                'max:20',
                'regex:/^\d{4}-\d{1,2}-\d{4,6}$/',
                Rule::unique('students', 'student_number'),
            ],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'section_id' => [
                'required',
                'integer',
                Rule::in($scopedSectionIds->all()),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'student_number.regex' => 'Student ID must follow the format YYYY-N-##### (e.g. 2022-0-00000).',
            'student_number.unique' => 'This student ID is already registered.',
            'section_id.in' => 'Please select an active section in your scope.',
        ];
    }
}
