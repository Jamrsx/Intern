<?php

use App\Models\Course;
use App\Models\Role;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;

it('allows a dean to manage sections for their course and school year', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    $deanRoleId = Role::query()->where('name', 'dean')->value('id');
    $schoolYear = SchoolYear::query()->where('name', '2025-2026')->firstOrFail();

    $dean = User::factory()->create([
        'role_id' => $deanRoleId,
    ]);

    $course = Course::query()->create([
        'code' => 'BSIT',
        'name' => 'Bachelor of Science in Information Technology',
        'required_hours' => 486,
        'dean_user_id' => $dean->id,
        'is_active' => true,
    ]);

    $this->actingAs($dean)
        ->post(route('deans.sections.store'), [
            'school_year_id' => $schoolYear->id,
            'name' => '4A',
            'code' => '4A',
            'is_active' => '1',
        ])
        ->assertRedirect(route('deans.sections.index'));

    $section = Section::query()
        ->where('course_id', $course->id)
        ->where('school_year_id', $schoolYear->id)
        ->where('name', '4A')
        ->first();

    expect($section)->not->toBeNull();
    expect($section?->is_active)->toBeTrue();

    $this->actingAs($dean)
        ->get(route('deans.sections.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('deans/sections')
            ->has('sections', 1)
            ->where('sections.0.display_name', 'BSIT 4A'));

    $this->actingAs($dean)
        ->patch(route('deans.sections.update', $section), [
            'school_year_id' => $schoolYear->id,
            'name' => '4B',
            'code' => '4B',
            'is_active' => '1',
        ])
        ->assertRedirect(route('deans.sections.index'));

    expect($section->fresh()?->name)->toBe('4B');
});

it('rejects sections assigned to inactive school years', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    $deanRoleId = Role::query()->where('name', 'dean')->value('id');
    $inactiveSchoolYear = SchoolYear::query()->where('name', '2026-2027')->firstOrFail();

    $dean = User::factory()->create([
        'role_id' => $deanRoleId,
    ]);

    Course::query()->create([
        'code' => 'BSIT',
        'name' => 'Bachelor of Science in Information Technology',
        'required_hours' => 486,
        'dean_user_id' => $dean->id,
        'is_active' => true,
    ]);

    $this->actingAs($dean)
        ->post(route('deans.sections.store'), [
            'school_year_id' => $inactiveSchoolYear->id,
            'name' => '4A',
            'is_active' => '1',
        ])
        ->assertSessionHasErrors('school_year_id');
});

it('blocks section management when dean has no assigned course', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    $deanRoleId = Role::query()->where('name', 'dean')->value('id');
    $schoolYear = SchoolYear::query()->where('name', '2025-2026')->firstOrFail();

    $dean = User::factory()->create([
        'role_id' => $deanRoleId,
    ]);

    $this->actingAs($dean)
        ->post(route('deans.sections.store'), [
            'school_year_id' => $schoolYear->id,
            'name' => '4A',
            'is_active' => '1',
        ])
        ->assertForbidden();
});
