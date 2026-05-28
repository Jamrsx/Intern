<?php

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

test('super admin is redirected to superadmin dashboard after login', function () {
    $role = Role::query()->where('name', 'super_admin')->first();
    $user = User::factory()->create([
        'role_id' => $role->id,
        'email' => 'superadmin@gmail.com',
        'password' => 'sadmin123',
    ]);

    $response = $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'sadmin123',
    ]);

    $response->assertRedirect(route('superadmin.dashboard', absolute: false));
});

test('super admin can visit superadmin dashboard', function () {
    $role = Role::query()->where('name', 'super_admin')->first();
    $user = User::factory()->create(['role_id' => $role->id]);

    $this->actingAs($user)
        ->get(route('superadmin.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('superAdmin/dashboard')
            ->has('stats')
        );
});

test('non super admin cannot visit superadmin dashboard', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('superadmin.dashboard'))
        ->assertForbidden();
});

test('guest cannot visit superadmin dashboard', function () {
    $this->get(route('superadmin.dashboard'))
        ->assertRedirect(route('login'));
});
