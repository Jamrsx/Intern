<?php

namespace App\Http\Requests\Dean;

use App\Concerns\AuthorizesDeanPortal;
use App\Models\Section;
use App\Support\DeanPortalScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCoordinatorRequest extends FormRequest
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
        $scopedSectionIds = DeanPortalScope::sectionsQuery($this->user())
            ->where('is_active', true)
            ->whereNull('coordinator_user_id')
            ->whereHas('schoolYear', fn ($query) => $query->where('is_active', true))
            ->pluck('id');

        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'section_id' => ['required', 'integer', Rule::in($scopedSectionIds->all())],
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
            'section_id.in' => 'Please select an active section without a coordinator assigned.',
        ];
    }

    public function section(): Section
    {
        return Section::query()->findOrFail($this->integer('section_id'));
    }
}
