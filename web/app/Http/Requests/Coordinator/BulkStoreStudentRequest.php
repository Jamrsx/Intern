<?php

namespace App\Http\Requests\Coordinator;

use App\Models\Section;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkStoreStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! ($this->user()?->hasRole('coordinator') ?? false)) {
            return false;
        }

        return $this->coordinatorSection() !== null;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'students' => ['required', 'array', 'min:1', 'max:100'],
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
        ];
    }

    private function coordinatorSection(): ?Section
    {
        return Section::query()
            ->where('coordinator_user_id', $this->user()?->id)
            ->where('is_active', true)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_active', true))
            ->first();
    }
}
