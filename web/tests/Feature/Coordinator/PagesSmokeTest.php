<?php

use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;

it('renders coordinator partner management pages', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator] = createCoordinatorWithSection();

    $this->actingAs($coordinator)
        ->get(route('coordinators.companies.index'))
        ->assertOk();

    $this->actingAs($coordinator)
        ->get(route('coordinators.companies.deactivated'))
        ->assertOk();

    $this->actingAs($coordinator)
        ->get(route('coordinators.supervisors.index'))
        ->assertOk();
});
