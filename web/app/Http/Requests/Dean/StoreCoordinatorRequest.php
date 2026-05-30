<?php

namespace App\Http\Requests\Dean;

use App\Models\Section;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCoordinatorRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'section_id' => [
                'required',
                'integer',
                Rule::exists('sections', 'id')->where(function ($query) use ($courseId) {
                    $query->where('course_id', $courseId)
                        ->where('is_active', true)
                        ->whereNull('coordinator_user_id')
                        ->whereIn('school_year_id', function ($subQuery) {
                            $subQuery->select('id')
                                ->from('school_years')
                                ->where('is_active', true);
                        });
                }),
            ],
            'password' => [
                Rule::requiredIf(fn () => ! $this->boolean('send_credentials_email')),
                'nullable',
                'string',
                'min:8',
                'max:255',
            ],
            'send_credentials_email' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.unique' => 'This email is already registered.',
            'section_id.exists' => 'Please select an active section without a coordinator assigned.',
        ];
    }

    public function section(): Section
    {
        return Section::query()->findOrFail($this->integer('section_id'));
    }
}
