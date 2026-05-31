<?php

use App\Models\Course;
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

    Course::query()->create([
        'code' => 'BSIT',
        'name' => 'Bachelor of Science in Information Technology',
        'required_hours' => 486,
        'dean_user_id' => $user->id,
        'is_active' => true,
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
        ->get(route('deans.sections.index'))
        ->assertOk();

    $this->actingAs($user)
        ->get(route('deans.coordinators.index'))
        ->assertOk();
});
