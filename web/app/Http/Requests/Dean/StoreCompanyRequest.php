<?php

namespace App\Http\Requests\Dean;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('dean') ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150', 'unique:companies,name'],
            'address' => ['nullable', 'string', 'max:500'],
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
            'name.unique' => 'This company name is already registered.',
            'departments.*.name.distinct' => 'Duplicate department names are not allowed for the same company.',
        ];
    }
}
