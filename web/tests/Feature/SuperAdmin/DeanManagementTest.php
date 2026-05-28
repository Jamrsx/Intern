<?php

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->superAdmin = User::factory()->create([
        'role_id' => Role::query()->where('name', 'super_admin')->value('id'),
    ]);
});

test('super admin can view deans page', function () {
    $this->actingAs($this->superAdmin)
        ->get(route('superadmin.deans.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('superAdmin/deans'));
});

test('super admin can create a dean', function () {
    $deanRoleId = Role::query()->where('name', 'dean')->value('id');

    $this->actingAs($this->superAdmin)
        ->post(route('superadmin.deans.store'), [
            'name' => 'Dean Test',
            'email' => 'dean.test@occ.edu.ph',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ])
        ->assertRedirect(route('superadmin.deans.index'));

    expect(User::query()->where('email', 'dean.test@occ.edu.ph')->value('role_id'))
        ->toBe($deanRoleId);
});

test('super admin can deactivate a dean', function () {
    $deanRoleId = Role::query()->where('name', 'dean')->value('id');
    $dean = User::factory()->create(['role_id' => $deanRoleId]);

    $this->actingAs($this->superAdmin)
        ->delete(route('superadmin.deans.destroy', $dean))
        ->assertRedirect(route('superadmin.deans.index'));

    expect($dean->fresh()->is_active)->toBeFalse();
});

test('non super admin cannot manage deans', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('superadmin.deans.index'))
        ->assertForbidden();
});
