<?php

namespace App\Http\Requests\Dean;

use App\Concerns\AuthorizesDeanPortal;
use App\Support\DeanPortalScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkStoreStudentRequest extends FormRequest
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
            'section_id' => ['nullable', 'integer', Rule::in($scopedSectionIds->all())],
            'students' => ['required', 'array', 'min:1', 'max:100'],
            'students.*.section_id' => [
                'required_without:section_id',
                'nullable',
                'integer',
                Rule::in($scopedSectionIds->all()),
            ],
            'students.*.email' => ['nullable', 'string', 'email', 'max:255', 'distinct', 'unique:users,email'],
            'students.*.student_number' => [
                'required',
                'string',
                'max:20',
                'regex:/^\d{4}-\d{1,2}-\d{4,6}$/',
                'distinct',
                Rule::unique('students', 'student_number'),
            ],
            'students.*.first_name' => ['required', 'string', 'max:100'],
            'students.*.middle_name' => ['nullable', 'string', 'max:100'],
            'students.*.last_name' => ['required', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'students.*.email.distinct' => 'Duplicate emails are not allowed in the same bulk upload.',
            'students.*.email.unique' => 'One or more emails are already registered.',
            'students.*.student_number.distinct' => 'Duplicate student IDs are not allowed in the same bulk upload.',
            'students.*.student_number.unique' => 'One or more student IDs are already registered.',
            'students.*.student_number.regex' => 'Student IDs must follow the format YYYY-N-##### (e.g. 2022-0-00000).',
            'section_id.in' => 'Please select an active section in your scope.',
            'students.*.section_id.in' => 'One or more rows use a section outside your scope.',
        ];
    }
}
