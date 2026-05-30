<?php

use App\Models\Role;
use App\Models\SchoolYear;
use App\Models\User;
use Database\Seeders\RoleSeeder;

it('allows a dean to manage school years', function () {
    $this->seed(RoleSeeder::class);

    $deanRoleId = Role::query()->where('name', 'dean')->value('id');

    $dean = User::factory()->create([
        'role_id' => $deanRoleId,
    ]);

    $this->actingAs($dean)
        ->post(route('deans.school-years.store'), [
            'name' => '2027-2028',
            'start_date' => '2027-06-01',
            'end_date' => '2028-05-31',
            'is_active' => '1',
        ])
        ->assertRedirect(route('deans.school-years.index'));

    $schoolYear = SchoolYear::query()->where('name', '2027-2028')->first();

    expect($schoolYear)->not->toBeNull();
    expect($schoolYear?->is_active)->toBeTrue();
    expect(SchoolYear::query()->where('is_active', true)->count())->toBe(1);

    $this->actingAs($dean)
        ->patch(route('deans.school-years.update', $schoolYear), [
            'name' => '2027-2028',
            'start_date' => '2027-06-01',
            'end_date' => '2028-05-31',
            'is_active' => '0',
        ])
        ->assertRedirect(route('deans.school-years.index'));

    $this->actingAs($dean)
        ->patch(route('deans.school-years.activate', $schoolYear))
        ->assertRedirect(route('deans.school-years.index'));

    expect($schoolYear->fresh()?->is_active)->toBeTrue();
});

it('blocks non-deans from school year management', function () {
    $this->seed(RoleSeeder::class);

    $user = User::factory()->create([
        'role_id' => Role::query()->where('name', 'coordinator')->value('id'),
    ]);

    $this->actingAs($user)
        ->get(route('deans.school-years.index'))
        ->assertForbidden();
});
