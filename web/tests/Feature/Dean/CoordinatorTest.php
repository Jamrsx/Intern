<?php

use App\Mail\CoordinatorAccountCredentialsMail;
use App\Models\Course;
use App\Models\Role;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

it('allows a dean to manage coordinators for their course sections', function () {
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

    $section = Section::query()->create([
        'course_id' => $course->id,
        'school_year_id' => $schoolYear->id,
        'name' => '4A',
        'is_active' => true,
    ]);

    $this->actingAs($dean)
        ->post(route('deans.coordinators.store'), [
            'name' => 'Ana Reyes',
            'email' => 'ana.reyes@gmail.com',
            'section_id' => $section->id,
            'password' => 'password',
        ])
        ->assertRedirect(route('deans.coordinators.index'));

    $coordinator = User::query()->where('email', 'ana.reyes@gmail.com')->first();

    expect($coordinator)->not->toBeNull();
    expect($coordinator?->hasRole('coordinator'))->toBeTrue();
    expect(Hash::check('password', (string) $coordinator?->password))->toBeTrue();
    expect($section->fresh()?->coordinator_user_id)->toBe($coordinator?->id);

    $anotherSection = Section::query()->create([
        'course_id' => $course->id,
        'school_year_id' => $schoolYear->id,
        'name' => '4B',
        'is_active' => true,
    ]);

    $this->actingAs($dean)
        ->patch(route('deans.coordinators.update', $coordinator), [
            'name' => 'Ana M. Reyes',
            'email' => 'ana.updated@gmail.com',
            'section_id' => $anotherSection->id,
            'is_active' => '1',
        ])
        ->assertRedirect(route('deans.coordinators.index'));

    expect($coordinator->fresh()?->name)->toBe('Ana M. Reyes');
    expect($section->fresh()?->coordinator_user_id)->toBeNull();
    expect($anotherSection->fresh()?->coordinator_user_id)->toBe($coordinator?->id);

    $this->actingAs($dean)
        ->delete(route('deans.coordinators.destroy', $coordinator))
        ->assertRedirect(route('deans.coordinators.index'));

    expect($coordinator->fresh()?->is_active)->toBeFalse();
    expect($anotherSection->fresh()?->coordinator_user_id)->toBeNull();
});

it('blocks assigning a coordinator to a section that already has one', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    $deanRoleId = Role::query()->where('name', 'dean')->value('id');
    $coordinatorRoleId = Role::query()->where('name', 'coordinator')->value('id');
    $schoolYear = SchoolYear::query()->where('name', '2025-2026')->firstOrFail();

    $dean = User::factory()->create(['role_id' => $deanRoleId]);

    $course = Course::query()->create([
        'code' => 'BSIT',
        'name' => 'Bachelor of Science in Information Technology',
        'required_hours' => 486,
        'dean_user_id' => $dean->id,
        'is_active' => true,
    ]);

    $existingCoordinator = User::factory()->create([
        'role_id' => $coordinatorRoleId,
    ]);

    $section = Section::query()->create([
        'course_id' => $course->id,
        'school_year_id' => $schoolYear->id,
        'name' => '4A',
        'coordinator_user_id' => $existingCoordinator->id,
        'is_active' => true,
    ]);

    $this->actingAs($dean)
        ->post(route('deans.coordinators.store'), [
            'name' => 'New Coordinator',
            'email' => 'new.coordinator@gmail.com',
            'section_id' => $section->id,
            'password' => 'password',
        ])
        ->assertSessionHasErrors('section_id');

    expect(User::query()->where('email', 'new.coordinator@gmail.com')->exists())->toBeFalse();
});

it('allows a dean to email coordinator credentials and reset the password', function () {
    Mail::fake();

    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    $deanRoleId = Role::query()->where('name', 'dean')->value('id');
    $schoolYear = SchoolYear::query()->where('name', '2025-2026')->firstOrFail();

    $dean = User::factory()->create(['role_id' => $deanRoleId]);

    $course = Course::query()->create([
        'code' => 'BSIT',
        'name' => 'Bachelor of Science in Information Technology',
        'required_hours' => 486,
        'dean_user_id' => $dean->id,
        'is_active' => true,
    ]);

    $section = Section::query()->create([
        'course_id' => $course->id,
        'school_year_id' => $schoolYear->id,
        'name' => '4A',
        'is_active' => true,
    ]);

    $this->actingAs($dean)
        ->post(route('deans.coordinators.store'), [
            'name' => 'Ana Reyes',
            'email' => 'ana.reyes@gmail.com',
            'section_id' => $section->id,
            'password' => 'password',
            'send_credentials_email' => '1',
        ])
        ->assertRedirect(route('deans.coordinators.index'));

    $coordinator = User::query()->where('email', 'ana.reyes@gmail.com')->firstOrFail();

    Mail::assertSent(CoordinatorAccountCredentialsMail::class, fn (CoordinatorAccountCredentialsMail $mail) => $mail->hasTo('ana.reyes@gmail.com'));
    expect(Hash::check('password', (string) $coordinator->password))->toBeFalse();

    $originalPasswordHash = $coordinator->fresh()?->password;

    Mail::fake();

    $this->actingAs($dean)
        ->post(route('deans.coordinators.mail-credentials', $coordinator))
        ->assertRedirect(route('deans.coordinators.index'));

    Mail::assertSent(CoordinatorAccountCredentialsMail::class, fn (CoordinatorAccountCredentialsMail $mail) => $mail->hasTo('ana.reyes@gmail.com'));
    expect($coordinator->fresh()?->password)->not->toBe($originalPasswordHash);
});
