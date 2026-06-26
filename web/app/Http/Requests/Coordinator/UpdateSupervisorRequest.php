<?php

namespace App\Http\Requests\Coordinator;

use App\Http\Requests\Coordinator\Concerns\AuthorizesCoordinatorCourse;
use App\Models\Supervisor;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSupervisorRequest extends FormRequest
{
    use AuthorizesCoordinatorCourse;

    public function authorize(): bool
    {
        if (! $this->isCoordinatorWithCourse()) {
            return false;
        }

        $supervisor = $this->route('supervisor');

        if (! $supervisor instanceof Supervisor) {
            return false;
        }

        $supervisor->loadMissing('company');

        return $supervisor->company?->course_id === $this->coordinatorCourseId();
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        /** @var Supervisor $supervisor */
        $supervisor = $this->route('supervisor');
        $courseId = $this->coordinatorCourseId();

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
            'position_title' => ['nullable', 'string', 'max:100'],
            'is_department_head' => ['sometimes', 'boolean'],
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
            'is_department_head' => 'Select a department before marking this supervisor as department head.',
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator): void {
            if (
                $this->boolean('is_department_head')
                && empty($this->input('department_id'))
            ) {
                $validator->errors()->add(
                    'is_department_head',
                    'Select a department before marking this supervisor as department head.',
                );
            }
        });
    }
}
