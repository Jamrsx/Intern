<?php

namespace App\Http\Requests\Dean;

use App\Concerns\AuthorizesDeanPortal;
use App\Models\Section;
use App\Models\User;
use App\Support\DeanPortalScope;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCoordinatorRequest extends FormRequest
{
    use AuthorizesDeanPortal;

    public function authorize(): bool
    {
        $coordinator = $this->route('coordinator');

        if (! $this->authorizedForDeanPortal() || ! $coordinator instanceof User) {
            return false;
        }

        return $coordinator->hasRole('coordinator')
            && DeanPortalScope::sectionsQuery($this->user())
                ->where('coordinator_user_id', $coordinator->id)
                ->exists();
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        /** @var User $coordinator */
        $coordinator = $this->route('coordinator');

        $scopedSectionIds = DeanPortalScope::sectionsQuery($this->user())
            ->where('is_active', true)
            ->where(function ($query) use ($coordinator) {
                $query->whereNull('coordinator_user_id')
                    ->orWhere('coordinator_user_id', $coordinator->id);
            })
            ->whereHas('schoolYear', fn ($query) => $query->where('is_active', true))
            ->pluck('id');

        return [
            'name' => ['required', 'string', 'max:150'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($coordinator->id),
            ],
            'section_id' => ['required', 'integer', Rule::in($scopedSectionIds->all())],
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
            'section_id.in' => 'Please select a valid section for this coordinator.',
        ];
    }

    public function section(): Section
    {
        return Section::query()->findOrFail($this->integer('section_id'));
    }
}
