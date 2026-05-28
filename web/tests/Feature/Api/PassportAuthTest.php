<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Passport\Passport;

uses(RefreshDatabase::class);

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
