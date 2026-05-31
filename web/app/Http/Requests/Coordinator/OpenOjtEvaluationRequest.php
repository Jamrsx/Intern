<?php

namespace App\Http\Requests\Coordinator;

use App\Http\Requests\Coordinator\Concerns\AuthorizesCoordinatorCourse;
use App\Models\OjtEvaluationTemplate;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OpenOjtEvaluationRequest extends FormRequest
{
    use AuthorizesCoordinatorCourse;

    public function authorize(): bool
    {
        return $this->isCoordinatorWithCourse();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $sectionId = $this->coordinatorSectionId();

        return [
            'evaluation_template_id' => [
                'required',
                'integer',
                Rule::exists('ojt_evaluation_templates', 'id')->where(function ($query) use ($sectionId) {
                    $query->where('section_id', $sectionId)
                        ->where('is_active', true);
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
            'evaluation_template_id.required' => 'Please select an evaluation sheet to send.',
            'evaluation_template_id.exists' => 'The selected evaluation sheet is not available.',
        ];
    }
}
