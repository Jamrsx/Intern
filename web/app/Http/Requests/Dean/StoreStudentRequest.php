<?php

namespace App\Http\Requests\Dean;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStudentRequest extends FormRequest
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
        ];
    }
}
