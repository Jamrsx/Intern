<?php

namespace App\Http\Requests\SuperAdmin;

use App\Models\Course;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCourseRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->dean_user_id === '' || $this->dean_user_id === null) {
            $this->merge(['dean_user_id' => null]);
        }

        $this->merge([
            'is_active' => filter_var($this->input('is_active'), FILTER_VALIDATE_BOOLEAN),
        ]);

        $majors = collect($this->input('majors', []))
            ->filter(fn (mixed $major): bool => is_array($major) && filled($major['name'] ?? null))
            ->map(fn (array $major): array => [
                'name' => trim((string) $major['name']),
                'code' => filled($major['code'] ?? null) ? trim((string) $major['code']) : null,
            ])
            ->values()
            ->all();

        $this->merge(['majors' => $majors]);
    }

    public function authorize(): bool
    {
        return $this->user()?->hasRole('super_admin') ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        /** @var Course $course */
        $course = $this->route('course');
        $deanRoleId = Role::query()->where('name', 'dean')->value('id');

        return [
            'code' => ['required', 'string', 'max:20', Rule::unique(Course::class, 'code')->ignore($course->id)],
            'name' => ['required', 'string', 'max:255'],
            'required_hours' => ['required', 'integer', 'min:1', 'max:9999'],
            'dean_user_id' => [
                'nullable',
                'integer',
                Rule::exists(User::class, 'id')->where('role_id', $deanRoleId),
                Rule::unique(Course::class, 'dean_user_id')->ignore($course->id),
            ],
            'is_active' => ['required', 'boolean'],
            'majors' => ['nullable', 'array'],
            'majors.*.name' => ['required', 'string', 'max:255'],
            'majors.*.code' => ['nullable', 'string', 'max:20'],
        ];
    }
}
