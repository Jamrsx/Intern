<?php

namespace App\Http\Requests\Coordinator;

use App\Http\Requests\Coordinator\Concerns\AuthorizesCoordinatorCourse;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCompanyRequest extends FormRequest
{
    use AuthorizesCoordinatorCourse;

    public function authorize(): bool
    {
        return $this->isCoordinatorWithCourse();
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $courseId = $this->coordinatorCourseId();

        return [
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('companies', 'name')->where('course_id', $courseId),
            ],
            'address' => ['nullable', 'string', 'max:500'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'geofence_radius_meters' => ['required', 'integer', 'min:1', 'max:5000'],
            'geofence_enabled' => ['sometimes', 'boolean'],
            'departments' => ['required', 'array', 'min:1', 'max:20'],
            'departments.*.name' => ['required', 'string', 'max:100', 'distinct'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.unique' => 'This company name is already registered for your course.',
            'departments.*.name.distinct' => 'Duplicate department names are not allowed for the same company.',
        ];
    }
}
