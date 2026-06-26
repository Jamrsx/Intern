<?php

namespace App\Http\Requests\Dean;

use App\Concerns\AuthorizesDeanPortal;
use App\Models\Section;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSectionRequest extends FormRequest
{
    use AuthorizesDeanPortal;

    public function authorize(): bool
    {
        $section = $this->route('section');

        return $section instanceof Section
            && $this->sectionInDeanPortalScope($section);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $courseId = $this->user()?->deanPortalCourse()?->id;

        /** @var Section $section */
        $section = $this->route('section');

        return [
            'school_year_id' => [
                'required',
                'integer',
                Rule::exists('school_years', 'id')->where('is_active', true),
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
                            $section->course_major_id !== null,
                            fn ($scopedQuery) => $scopedQuery->where(
                                'course_major_id',
                                $section->course_major_id,
                            ),
                            fn ($scopedQuery) => $scopedQuery->whereNull('course_major_id'),
                        ))
                    ->ignore($section->id),
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
        ];
    }
}
