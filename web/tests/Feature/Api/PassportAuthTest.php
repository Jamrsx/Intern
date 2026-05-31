<?php

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Hash;
use Laravel\Passport\Passport;

uses(RefreshDatabase::class);

function ensurePassportPersonalClient(): void
{
    Artisan::call('passport:keys', ['--force' => true]);
    Artisan::call('passport:client', [
        '--personal' => true,
        '--name' => 'Test Mobile Client',
        '--provider' => 'users',
        '--no-interaction' => true,
    ]);
}

it('returns the authenticated api user', function () {
    $user = User::factory()->create();

    Passport::actingAs($user);

    $this->getJson('/api/user')
        ->assertSuccessful()
        ->assertJsonPath('id', $user->id);
});

it('returns the authenticated user profile', function () {
    $user = User::factory()->create();

    Passport::actingAs($user);

    $this->getJson('/api/auth/me')
        ->assertSuccessful()
        ->assertJsonPath('user.id', $user->id);
});

it('allows an intern to log in with student id and password', function () {
    ensurePassportPersonalClient();

    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    $student->user->update([
        'password' => Hash::make('password123'),
    ]);

    $this->postJson('/api/auth/login', [
        'student_number' => $student->student_number,
        'password' => 'password123',
    ])
        ->assertSuccessful()
        ->assertJsonPath('student.student_number', $student->student_number)
        ->assertJsonPath('user.role.name', 'intern')
        ->assertJsonStructure(['access_token', 'token_type', 'user', 'student']);
});

it('rejects mobile login with invalid student id or password', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['student' => $student] = createCoordinatorWithSection();

    $this->postJson('/api/auth/login', [
        'student_number' => $student->student_number,
        'password' => 'wrong-password',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['student_number']);
});

it('rejects mobile login for unknown student id', function () {
    $this->seed(RoleSeeder::class);

    $this->postJson('/api/auth/login', [
        'student_number' => '2022-1-99999',
        'password' => 'password123',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['student_number']);
});
