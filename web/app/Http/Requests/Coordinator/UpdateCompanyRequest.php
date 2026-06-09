<?php

namespace App\Http\Requests\Coordinator;

use App\Http\Requests\Coordinator\Concerns\AuthorizesCoordinatorCourse;
use App\Models\Company;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCompanyRequest extends FormRequest
{
    use AuthorizesCoordinatorCourse;

    public function authorize(): bool
    {
        if (! $this->isCoordinatorWithCourse()) {
            return false;
        }

        $company = $this->route('company');

        if (! $company instanceof Company) {
            return false;
        }

        return $company->course_id === $this->coordinatorCourseId();
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        /** @var Company $company */
        $company = $this->route('company');

        return [
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('companies', 'name')
                    ->where('course_id', $company->course_id)
                    ->ignore($company->id),
            ],
            'address' => ['nullable', 'string', 'max:500'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'geofence_radius_meters' => ['required', 'integer', 'min:1', 'max:5000'],
            'geofence_enabled' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.unique' => 'This company name is already registered for your course.',
        ];
    }
}
