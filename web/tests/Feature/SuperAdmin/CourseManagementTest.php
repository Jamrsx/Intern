<?php

use App\Models\Course;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RoleSeeder;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->superAdmin = User::factory()->create([
        'role_id' => Role::query()->where('name', 'super_admin')->value('id'),
    ]);
});

test('super admin can view courses page', function () {
    $this->actingAs($this->superAdmin)
        ->get(route('superadmin.courses.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('superAdmin/courses'));
});

test('super admin can create a course', function () {
    $this->actingAs($this->superAdmin)
        ->post(route('superadmin.courses.store'), [
            'code' => 'BSIT',
            'name' => 'Bachelor of Science in IT',
            'required_hours' => 486,
            'dean_user_id' => null,
            'is_active' => true,
        ])
        ->assertRedirect(route('superadmin.courses.index'));

    expect(Course::query()->where('code', 'BSIT')->exists())->toBeTrue();
});

test('super admin can assign dean to course', function () {
    $deanRoleId = Role::query()->where('name', 'dean')->value('id');
    $dean = User::factory()->create(['role_id' => $deanRoleId]);

    $this->actingAs($this->superAdmin)
        ->post(route('superadmin.courses.store'), [
            'code' => 'BSBA',
            'name' => 'Bachelor of Science in BA',
            'required_hours' => 600,
            'dean_user_id' => $dean->id,
            'is_active' => true,
        ])
        ->assertRedirect(route('superadmin.courses.index'));

    expect(Course::query()->where('code', 'BSBA')->value('dean_user_id'))
        ->toBe($dean->id);
});

test('super admin can deactivate a course', function () {
    $course = Course::query()->create([
        'code' => 'BSCS',
        'name' => 'Computer Science',
        'required_hours' => 500,
        'is_active' => true,
    ]);

    $this->actingAs($this->superAdmin)
        ->delete(route('superadmin.courses.destroy', $course))
        ->assertRedirect(route('superadmin.courses.index'));

    expect($course->fresh()->is_active)->toBeFalse();
});
