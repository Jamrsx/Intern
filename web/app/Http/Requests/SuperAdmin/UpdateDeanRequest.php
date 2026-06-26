<?php

namespace App\Http\Requests\SuperAdmin;

use App\Concerns\ProfileValidationRules;
use App\Models\Course;
use App\Models\CourseMajor;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateDeanRequest extends FormRequest
{
    use ProfileValidationRules;

    protected function prepareForValidation(): void
    {
        $this->merge([
            'is_active' => filter_var($this->input('is_active'), FILTER_VALIDATE_BOOLEAN),
        ]);

        if ($this->course_id === '' || $this->course_id === null) {
            $this->merge(['course_id' => null]);
        }

        if ($this->course_major_id === '' || $this->course_major_id === null) {
            $this->merge(['course_major_id' => null]);
        }
    }

    public function authorize(): bool
    {
        return $this->user()?->hasRole('super_admin') ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        /** @var User $dean */
        $dean = $this->route('dean');

        return [
            ...$this->profileRules($dean->id),
            'password' => ['nullable', 'string', Password::default(), 'confirmed'],
            'is_active' => ['required', 'boolean'],
            'role' => ['required', Rule::in(['dean', 'program_head'])],
            'course_id' => [
                Rule::requiredIf(fn () => $this->input('role') === 'dean'),
                'nullable',
                'integer',
                Rule::exists(Course::class, 'id'),
                function (string $attribute, mixed $value, \Closure $fail) use ($dean): void {
                    if ($value === null || $value === '') {
                        return;
                    }

                    $course = Course::query()->find($value);

                    if ($course === null) {
                        return;
                    }

                    if (
                        $course->dean_user_id !== null
                        && $course->dean_user_id !== $dean->id
                    ) {
                        $fail('This course already has a college dean assigned.');
                    }
                },
            ],
            'course_major_id' => [
                Rule::requiredIf(fn () => $this->input('role') === 'program_head'),
                'nullable',
                'integer',
                Rule::exists(CourseMajor::class, 'id'),
                function (string $attribute, mixed $value, \Closure $fail) use ($dean): void {
                    if ($value === null || $value === '') {
                        return;
                    }

                    $major = CourseMajor::query()->find($value);

                    if ($major === null) {
                        return;
                    }

                    if (
                        $major->program_head_user_id !== null
                        && $major->program_head_user_id !== $dean->id
                    ) {
                        $fail('This program already has a program head assigned.');
                    }
                },
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'course_id.required' => 'Select a course for the college dean.',
            'course_major_id.required' => 'Select a program for the program head.',
        ];
    }
}
