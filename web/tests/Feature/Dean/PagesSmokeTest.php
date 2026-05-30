<?php

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;

it('renders dean pages', function () {
    /** @var User $user */
    $this->seed(RoleSeeder::class);

    $deanRoleId = Role::query()->where('name', 'dean')->value('id');
    expect($deanRoleId)->not->toBeNull();

    $user = User::factory()->create([
        'role_id' => $deanRoleId,
    ]);

    $this->actingAs($user)
        ->get(route('deans.dashboard'))
        ->assertOk();

    $this->actingAs($user)
        ->get(route('deans.school-years.index'))
        ->assertOk();

    $this->actingAs($user)
        ->get(route('deans.students.index'))
        ->assertOk();

    $this->actingAs($user)
        ->get(route('deans.companies.index'))
        ->assertOk();

    $this->actingAs($user)
        ->get(route('deans.sections.index'))
        ->assertOk();

    $this->actingAs($user)
        ->get(route('deans.coordinators.index'))
        ->assertOk();

    $this->actingAs($user)
        ->get(route('deans.supervisors.index'))
        ->assertOk();
});
