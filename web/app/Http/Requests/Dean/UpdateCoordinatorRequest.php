<?php

namespace App\Http\Requests\Dean;

use App\Models\Section;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCoordinatorRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! ($this->user()?->hasRole('dean') ?? false)) {
            return false;
        }

        $courseId = $this->user()?->courseAsDean?->id;
        $coordinator = $this->route('coordinator');

        if ($courseId === null || ! $coordinator instanceof User) {
            return false;
        }

        return $coordinator->hasRole('coordinator')
            && Section::query()
                ->where('course_id', $courseId)
                ->where('coordinator_user_id', $coordinator->id)
                ->exists();
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $courseId = $this->user()?->courseAsDean?->id;

        /** @var User $coordinator */
        $coordinator = $this->route('coordinator');

        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($coordinator->id),
            ],
            'section_id' => [
                'required',
                'integer',
                Rule::exists('sections', 'id')->where(function ($query) use ($courseId, $coordinator) {
                    $query->where('course_id', $courseId)
                        ->where('is_active', true)
                        ->where(function ($inner) use ($coordinator) {
                            $inner->whereNull('coordinator_user_id')
                                ->orWhere('coordinator_user_id', $coordinator->id);
                        })
                        ->whereIn('school_year_id', function ($subQuery) {
                            $subQuery->select('id')
                                ->from('school_years')
                                ->where('is_active', true);
                        });
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
            'email.unique' => 'This email is already registered.',
            'section_id.exists' => 'Please select a valid section for this coordinator.',
        ];
    }

    public function section(): Section
    {
        return Section::query()->findOrFail($this->integer('section_id'));
    }
}
