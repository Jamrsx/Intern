<?php

use App\Models\Company;
use App\Models\Course;
use App\Models\Role;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;
use Inertia\Testing\AssertableInertia as Assert;

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

it('scopes school year section counts to the logged-in dean course', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    $deanRoleId = Role::query()->where('name', 'dean')->value('id');
    $schoolYear = SchoolYear::query()->where('name', '2025-2026')->firstOrFail();

    $bsitDean = User::factory()->create(['role_id' => $deanRoleId]);
    $educDean = User::factory()->create(['role_id' => $deanRoleId]);

    $bsitCourse = Course::query()->create([
        'code' => 'BSIT',
        'name' => 'Bachelor of Science in Information Technology',
        'required_hours' => 486,
        'dean_user_id' => $bsitDean->id,
        'is_active' => true,
    ]);

    Course::query()->create([
        'code' => 'EDUC',
        'name' => 'Bachelor of Elementary Education',
        'required_hours' => 486,
        'dean_user_id' => $educDean->id,
        'is_active' => true,
    ]);

    Section::query()->create([
        'course_id' => $bsitCourse->id,
        'school_year_id' => $schoolYear->id,
        'name' => '4A',
        'code' => '4A',
        'is_active' => true,
    ]);

    Section::query()->create([
        'course_id' => $bsitCourse->id,
        'school_year_id' => $schoolYear->id,
        'name' => '4B',
        'code' => '4B',
        'is_active' => true,
    ]);

    $this->actingAs($bsitDean)
        ->get(route('deans.school-years.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('deans/school-years')
            ->where('schoolYears.0.name', '2026-2027')
            ->where('schoolYears.0.sections_count', 0)
            ->where('schoolYears.1.name', '2025-2026')
            ->where('schoolYears.1.sections_count', 2));

    $this->actingAs($educDean)
        ->get(route('deans.school-years.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('deans/school-years')
            ->where('schoolYears.0.name', '2026-2027')
            ->where('schoolYears.0.sections_count', 0)
            ->where('schoolYears.1.name', '2025-2026')
            ->where('schoolYears.1.sections_count', 0));
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

it('shows archived inactive school years with sections students and placements', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    $deanRoleId = Role::query()->where('name', 'dean')->value('id');
    $internRoleId = Role::query()->where('name', 'intern')->value('id');
    $activeSchoolYear = SchoolYear::query()->where('name', '2025-2026')->firstOrFail();
    $inactiveSchoolYear = SchoolYear::query()->where('name', '2026-2027')->firstOrFail();

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
        'school_year_id' => $inactiveSchoolYear->id,
        'name' => '4A',
        'code' => '4A',
        'is_active' => true,
    ]);

    $internUser = User::factory()->create([
        'role_id' => $internRoleId,
        'email' => 'archived.intern@occ.edu.ph',
    ]);

    $company = Company::query()->create([
        'course_id' => $course->id,
        'section_id' => $section->id,
        'name' => 'DPWH CDO1 R10',
        'is_active' => true,
    ]);

    Student::query()->create([
        'user_id' => $internUser->id,
        'section_id' => $section->id,
        'student_number' => '2021-1-00001',
        'first_name' => 'Archived',
        'last_name' => 'Intern',
        'company_id' => $company->id,
        'is_active' => true,
    ]);

    expect($activeSchoolYear->is_active)->toBeTrue();
    expect($inactiveSchoolYear->is_active)->toBeFalse();

    $response = $this->actingAs($dean)
        ->get(route('deans.school-years.archive'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('deans/school-years/archive')
            ->where('course.code', 'BSIT')
            ->has('archivedSchoolYears', 2));

    $archived = $response->original->getData()['page']['props']['archivedSchoolYears'];
    $target = collect($archived)->firstWhere('name', '2026-2027');

    expect($target)->not->toBeNull();
    expect($target['sections'][0]['display_name'])->toBe('BSIT 4A');
    expect($target['sections'][0]['students'][0]['full_name'])->toBe('Archived Intern');
    expect($target['sections'][0]['students'][0]['is_active'])->toBeFalse();
    expect($target['sections'][0]['students'][0]['internship']['company'])->toBe('DPWH CDO1 R10');
    expect($section->fresh()?->is_active)->toBeFalse();
    expect(Student::query()->where('student_number', '2021-1-00001')->value('is_active'))->toBeFalse();
});

it('deactivates sections and student accounts when a school year is archived', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    $deanRoleId = Role::query()->where('name', 'dean')->value('id');
    $internRoleId = Role::query()->where('name', 'intern')->value('id');
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
        'code' => '4A',
        'is_active' => true,
    ]);

    $internUser = User::factory()->create([
        'role_id' => $internRoleId,
        'is_active' => true,
    ]);

    $student = Student::query()->create([
        'user_id' => $internUser->id,
        'section_id' => $section->id,
        'student_number' => '2022-1-04311',
        'first_name' => 'Althian',
        'last_name' => 'Baron',
        'is_active' => true,
    ]);

    $this->actingAs($dean)
        ->patch(route('deans.school-years.update', $schoolYear), [
            'name' => '2025-2026',
            'start_date' => '2025-06-01',
            'end_date' => '2026-05-31',
            'is_active' => '0',
        ])
        ->assertRedirect(route('deans.school-years.index'));

    expect($schoolYear->fresh()?->is_active)->toBeFalse();
    expect($section->fresh()?->is_active)->toBeFalse();
    expect($student->fresh()?->is_active)->toBeFalse();
    expect($internUser->fresh()?->is_active)->toBeFalse();
});

it('closes a school year and deactivates students in one action', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    $deanRoleId = Role::query()->where('name', 'dean')->value('id');
    $internRoleId = Role::query()->where('name', 'intern')->value('id');
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
        'code' => '4A',
        'is_active' => true,
    ]);

    $internUser = User::factory()->create([
        'role_id' => $internRoleId,
        'is_active' => true,
    ]);

    $student = Student::query()->create([
        'user_id' => $internUser->id,
        'section_id' => $section->id,
        'student_number' => '2022-1-04311',
        'first_name' => 'Althian',
        'last_name' => 'Baron',
        'is_active' => true,
    ]);

    $this->actingAs($dean)
        ->delete(route('deans.school-years.destroy', $schoolYear))
        ->assertRedirect(route('deans.school-years.index'));

    expect($schoolYear->fresh()?->is_active)->toBeFalse();
    expect($section->fresh()?->is_active)->toBeFalse();
    expect($student->fresh()?->is_active)->toBeFalse();
    expect($internUser->fresh()?->is_active)->toBeFalse();
});
