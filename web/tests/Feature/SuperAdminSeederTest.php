<?php

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SuperAdminSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('seeds the super admin user with the super_admin role', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SuperAdminSeeder::class);

    $superAdminRole = Role::query()->where('name', 'super_admin')->first();
    $user = User::query()->where('email', 'superadmin@occ.edu.ph')->first();

    expect($superAdminRole)->not->toBeNull()
        ->and($user)->not->toBeNull()
        ->and($user->role_id)->toBe($superAdminRole->id)
        ->and($user->is_active)->toBeTrue();
});
