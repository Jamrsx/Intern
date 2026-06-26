<?php

use App\Models\Course;
use App\Models\CourseMajor;
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
        ->assertInertia(fn ($page) => $page
            ->component('superAdmin/deans')
            ->has('leaders')
            ->has('courses'));
});

test('super admin can create a college dean with course assignment', function () {
    $deanRoleId = Role::query()->where('name', 'dean')->value('id');

    $course = Course::query()->create([
        'code' => 'BSBA',
        'name' => 'Bachelor of Science in Business Administration',
        'required_hours' => 600,
        'is_active' => true,
    ]);

    $this->actingAs($this->superAdmin)
        ->post(route('superadmin.deans.store'), [
            'name' => 'Dean Test',
            'email' => 'dean.test@occ.edu.ph',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'dean',
            'course_id' => $course->id,
        ])
        ->assertRedirect(route('superadmin.deans.index'));

    $dean = User::query()->where('email', 'dean.test@occ.edu.ph')->first();

    expect($dean)->not->toBeNull();
    expect($dean?->role_id)->toBe($deanRoleId);
    expect($course->fresh()?->dean_user_id)->toBe($dean?->id);
});

test('super admin can create a program head with major assignment', function () {
    $programHeadRoleId = Role::query()->where('name', 'program_head')->value('id');

    $course = Course::query()->create([
        'code' => 'BSBA',
        'name' => 'Bachelor of Science in Business Administration',
        'required_hours' => 600,
        'is_active' => true,
    ]);

    $major = CourseMajor::query()->create([
        'course_id' => $course->id,
        'name' => 'Financial Management',
        'code' => 'FM',
        'sort_order' => 0,
    ]);

    $this->actingAs($this->superAdmin)
        ->post(route('superadmin.deans.store'), [
            'name' => 'FM Program Head',
            'email' => 'fm.head@occ.edu.ph',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'program_head',
            'course_major_id' => $major->id,
        ])
        ->assertRedirect(route('superadmin.deans.index'));

    $programHead = User::query()->where('email', 'fm.head@occ.edu.ph')->first();

    expect($programHead)->not->toBeNull();
    expect($programHead?->role_id)->toBe($programHeadRoleId);
    expect($major->fresh()?->program_head_user_id)->toBe($programHead?->id);
});

test('super admin can deactivate a dean or program head', function () {
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
