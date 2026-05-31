<?php

use App\Mail\SupervisorAccountCredentialsMail;
use App\Models\Company;
use App\Models\Course;
use App\Models\Department;
use App\Models\Role;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\Supervisor;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

it('allows a coordinator to manage supervisors', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'section' => $section, 'course' => $course] = createCoordinatorWithSection();

    $company = Company::query()->create([
        'course_id' => $course->id,
        'name' => 'Opol LGU',
        'address' => 'Opol, Misamis Oriental',
        'is_active' => true,
    ]);

    $department = Department::query()->create([
        'company_id' => $company->id,
        'name' => 'HR',
        'is_active' => true,
    ]);

    $this->actingAs($coordinator)
        ->post(route('coordinators.supervisors.store'), [
            'name' => 'Maria Santos',
            'email' => 'maria.santos@gmail.com',
            'company_id' => $company->id,
            'department_id' => $department->id,
            'position_title' => 'HR Supervisor',
            'password' => 'password',
        ])
        ->assertRedirect(route('coordinators.supervisors.index'));

    $supervisor = Supervisor::query()
        ->whereHas('user', fn ($query) => $query->where('email', 'maria.santos@gmail.com'))
        ->first();

    expect($supervisor)->not->toBeNull();
    expect(Hash::check('password', (string) $supervisor?->user?->password))->toBeTrue();
    expect($supervisor?->company_id)->toBe($company->id);
    expect($supervisor?->department_id)->toBe($department->id);
    expect($supervisor?->position_title)->toBe('HR Supervisor');
    expect($supervisor?->user?->hasRole('supervisor'))->toBeTrue();

    $this->actingAs($coordinator)
        ->patch(route('coordinators.supervisors.update', $supervisor), [
            'name' => 'Maria S. Santos',
            'email' => 'maria.updated@gmail.com',
            'company_id' => $company->id,
            'department_id' => $department->id,
            'position_title' => 'Senior HR Supervisor',
            'is_active' => '1',
        ])
        ->assertRedirect(route('coordinators.supervisors.index'));

    expect($supervisor->fresh()?->user?->name)->toBe('Maria S. Santos');
    expect($supervisor->fresh()?->user?->email)->toBe('maria.updated@gmail.com');
    expect($supervisor->fresh()?->position_title)->toBe('Senior HR Supervisor');

    $this->actingAs($coordinator)
        ->delete(route('coordinators.supervisors.destroy', $supervisor))
        ->assertRedirect(route('coordinators.supervisors.index'));

    expect($supervisor->fresh()?->is_active)->toBeFalse();
    expect($supervisor->fresh()?->user?->is_active)->toBeFalse();
});

it('blocks deactivating a supervisor with active interns', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'section' => $section, 'course' => $course] = createCoordinatorWithSection();

    $internRoleId = Role::query()->where('name', 'intern')->value('id');
    $supervisorRoleId = Role::query()->where('name', 'supervisor')->value('id');

    $company = Company::query()->create([
        'course_id' => $course->id,
        'name' => 'Assigned Company',
        'is_active' => true,
    ]);

    $supervisorUser = User::factory()->create([
        'role_id' => $supervisorRoleId,
        'is_active' => true,
    ]);

    $supervisor = Supervisor::query()->create([
        'user_id' => $supervisorUser->id,
        'company_id' => $company->id,
        'is_active' => true,
    ]);

    $intern = User::factory()->create([
        'role_id' => $internRoleId,
        'is_active' => true,
    ]);

    Student::query()->create([
        'user_id' => $intern->id,
        'student_number' => '2022-1-08888',
        'first_name' => 'Assigned',
        'last_name' => 'Intern',
        'section_id' => $section->id,
        'company_id' => $company->id,
        'supervisor_id' => $supervisor->id,
        'is_active' => true,
    ]);

    $this->actingAs($coordinator)
        ->delete(route('coordinators.supervisors.destroy', $supervisor))
        ->assertRedirect(route('coordinators.supervisors.index'));

    expect($supervisor->fresh()?->is_active)->toBeTrue();
});

it('allows a coordinator to email supervisor credentials and reset the password', function () {
    Mail::fake();

    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'section' => $section, 'course' => $course] = createCoordinatorWithSection();

    $company = Company::query()->create([
        'course_id' => $course->id,
        'name' => 'Opol LGU',
        'address' => 'Opol, Misamis Oriental',
        'is_active' => true,
    ]);

    $this->actingAs($coordinator)
        ->post(route('coordinators.supervisors.store'), [
            'name' => 'Maria Santos',
            'email' => 'maria.santos@gmail.com',
            'company_id' => $company->id,
            'password' => 'password',
            'send_credentials_email' => '1',
        ])
        ->assertRedirect(route('coordinators.supervisors.index'));

    $supervisor = Supervisor::query()
        ->whereHas('user', fn ($query) => $query->where('email', 'maria.santos@gmail.com'))
        ->firstOrFail();

    Mail::assertSent(SupervisorAccountCredentialsMail::class, fn (SupervisorAccountCredentialsMail $mail) => $mail->hasTo('maria.santos@gmail.com'));
    expect(Hash::check('password', (string) $supervisor->user->password))->toBeFalse();

    $originalPasswordHash = $supervisor->fresh()?->user?->password;

    $this->actingAs($coordinator)
        ->post(route('coordinators.supervisors.mail-credentials', $supervisor))
        ->assertRedirect(route('coordinators.supervisors.index'));

    Mail::assertSent(SupervisorAccountCredentialsMail::class, fn (SupervisorAccountCredentialsMail $mail) => $mail->hasTo('maria.santos@gmail.com'));
    expect($supervisor->fresh()?->user?->password)->not->toBe($originalPasswordHash);
});
