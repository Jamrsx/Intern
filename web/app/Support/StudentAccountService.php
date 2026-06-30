<?php

namespace App\Support;

use App\Mail\StudentAccountCredentialsMail;
use App\Models\Role;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

class StudentAccountService
{
    public const DEFAULT_PASSWORD = 'password';

    /**
     * @return array{student: Student, password: string}
     */
    public function create(array $data): array
    {
        $internRoleId = Role::query()->where('name', 'intern')->valueOrFail('id');
        $password = $data['password'] ?? self::DEFAULT_PASSWORD;

        $user = User::query()->create([
            'name' => $this->fullName(
                $data['first_name'],
                $data['middle_name'] ?? null,
                $data['last_name'],
            ),
            'email' => $data['email'],
            'password' => $password,
            'role_id' => $internRoleId,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        $student = Student::query()->create([
            'user_id' => $user->id,
            'student_number' => $data['student_number'],
            'first_name' => $data['first_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'last_name' => $data['last_name'],
            'section_id' => $data['section_id'],
            'is_active' => true,
        ]);

        return [
            'student' => $student,
            'password' => $password,
        ];
    }

    public function sendCredentials(Student $student): void
    {
        $student->loadMissing('user');

        $password = self::DEFAULT_PASSWORD;

        $student->user->update([
            'password' => $password,
        ]);

        Mail::to($student->user->email)->send(
            new StudentAccountCredentialsMail(
                student: $student,
                plainPassword: $password,
                loginUrl: route('login'),
            ),
        );
    }

    public function fullName(string $firstName, ?string $middleName, string $lastName): string
    {
        return trim(collect([$firstName, $middleName, $lastName])->filter()->implode(' '));
    }

    public function generatedBulkEmail(string $studentNumber): string
    {
        $local = strtolower((string) preg_replace('/[^a-zA-Z0-9.-]/', '', $studentNumber));

        return "{$local}@students.occ.edu.ph";
    }
}
