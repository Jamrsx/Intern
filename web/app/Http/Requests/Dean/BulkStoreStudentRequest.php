<?php

namespace App\Http\Requests\Dean;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkStoreStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return ($this->user()?->hasRole('dean') ?? false)
            && $this->user()?->courseAsDean !== null;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $courseId = $this->user()?->courseAsDean?->id;

        return [
            'section_id' => [
                'nullable',
                'integer',
                Rule::exists('sections', 'id')->where(function ($query) use ($courseId) {
                    $query->where('course_id', $courseId)
                        ->where('is_active', true)
                        ->whereIn('school_year_id', function ($subQuery) {
                            $subQuery->select('id')
                                ->from('school_years')
                                ->where('is_active', true);
                        });
                }),
            ],
            'students' => ['required', 'array', 'min:1', 'max:100'],
            'students.*.section_id' => [
                'required_without:section_id',
                'nullable',
                'integer',
                Rule::exists('sections', 'id')->where(function ($query) use ($courseId) {
                    $query->where('course_id', $courseId)
                        ->where('is_active', true)
                        ->whereIn('school_year_id', function ($subQuery) {
                            $subQuery->select('id')
                                ->from('school_years')
                                ->where('is_active', true);
                        });
                }),
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
            'students.*.student_number.regex' => 'Student IDs must follow the format YYYY-N-##### (e.g. 2022-1-04311).',
        ];
    }
}
