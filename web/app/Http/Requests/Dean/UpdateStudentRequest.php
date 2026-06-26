<?php

namespace App\Http\Requests\Dean;

use App\Concerns\AuthorizesDeanPortal;
use App\Models\Student;
use App\Support\DeanPortalScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStudentRequest extends FormRequest
{
    use AuthorizesDeanPortal;

    public function authorize(): bool
    {
        $student = $this->route('student');

        if (! $student instanceof Student) {
            return false;
        }

        $student->loadMissing('section');

        return $this->authorizedForDeanPortal()
            && $student->section !== null
            && DeanPortalScope::sectionBelongsToScope($this->user(), $student->section);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $courseId = $this->user()?->deanPortalCourse()?->id;
        $scopedSectionIds = DeanPortalScope::sectionsQuery($this->user())
            ->where('is_active', true)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_active', true))
            ->pluck('id');

        /** @var Student $student */
        $student = $this->route('student');

        return [
            'student_number' => [
                'required',
                'string',
                'max:20',
                'regex:/^\d{4}-\d{1,2}-\d{4,6}$/',
                Rule::unique('students', 'student_number')->ignore($student->id),
            ],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($student->user_id),
            ],
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'section_id' => ['required', 'integer', Rule::in($scopedSectionIds->all())],
            'company_id' => [
                'nullable',
                'integer',
                Rule::exists('companies', 'id')->where(function ($query) use ($courseId) {
                    $query->where('course_id', $courseId)
                        ->where('is_active', true);
                }),
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
            'supervisor_id' => [
                'nullable',
                'integer',
                Rule::exists('supervisors', 'id')->where(function ($query) {
                    if (! $this->filled('company_id')) {
                        return;
                    }

                    $query->where('company_id', $this->input('company_id'))
                        ->where('is_active', true);

                    if ($this->filled('department_id')) {
                        $query->where(function ($inner) {
                            $inner->whereNull('department_id')
                                ->orWhere('department_id', $this->input('department_id'));
                        });
                    }
                }),
            ],
            'is_active' => ['sometimes', 'boolean'],
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
