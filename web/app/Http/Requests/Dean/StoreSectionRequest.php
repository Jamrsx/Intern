<?php

namespace App\Http\Requests\Dean;

use App\Concerns\AuthorizesDeanPortal;
use App\Models\CourseMajor;
use App\Support\DeanPortalScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSectionRequest extends FormRequest
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
        $user = $this->user();
        $course = DeanPortalScope::course($user);
        $courseId = $course?->id;
        $assignedMajor = DeanPortalScope::major($user);
        $majorId = $assignedMajor?->id ?? ($this->filled('course_major_id') ? (int) $this->input('course_major_id') : null);

        return [
            'school_year_id' => [
                'required',
                'integer',
                Rule::exists('school_years', 'id')->where('is_active', true),
            ],
            'course_major_id' => [
                Rule::requiredIf(
                    fn () => $assignedMajor === null
                        && $course !== null
                        && CourseMajor::query()->where('course_id', $course->id)->exists(),
                ),
                'nullable',
                'integer',
                Rule::exists('course_majors', 'id')->where(
                    fn ($query) => $query->where('course_id', $courseId),
                ),
            ],
            'name' => [
                'required',
                'string',
                'max:50',
                Rule::unique('sections', 'name')
                    ->where(fn ($query) => $query
                        ->where('course_id', $courseId)
                        ->where('school_year_id', $this->input('school_year_id'))
                        ->when(
                            $majorId !== null,
                            fn ($scopedQuery) => $scopedQuery->where('course_major_id', $majorId),
                            fn ($scopedQuery) => $scopedQuery->whereNull('course_major_id'),
                        )),
            ],
            'code' => ['nullable', 'string', 'max:20'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.unique' => 'This section name already exists for the selected school year and program.',
            'school_year_id.exists' => 'Please select an active school year.',
            'course_major_id.required' => 'Select a program for this section.',
        ];
    }
}
