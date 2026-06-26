<?php

use App\Models\Course;
use App\Models\CourseMajor;
use App\Models\Role;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    $this->schoolYear = SchoolYear::query()->where('name', '2025-2026')->firstOrFail();

    $this->course = Course::query()->create([
        'code' => 'BSBA',
        'name' => 'Bachelor of Science in Business Administration',
        'required_hours' => 600,
        'is_active' => true,
    ]);

    $this->fmMajor = CourseMajor::query()->create([
        'course_id' => $this->course->id,
        'name' => 'Financial Management',
        'code' => 'FM',
        'sort_order' => 0,
    ]);

    $this->mmMajor = CourseMajor::query()->create([
        'course_id' => $this->course->id,
        'name' => 'Marketing Management',
        'code' => 'MM',
        'sort_order' => 1,
    ]);

    $deanRoleId = Role::query()->where('name', 'dean')->value('id');
    $programHeadRoleId = Role::query()->where('name', 'program_head')->value('id');

    $this->collegeDean = User::factory()->create(['role_id' => $deanRoleId]);
    $this->course->update(['dean_user_id' => $this->collegeDean->id]);

    $this->fmHead = User::factory()->create(['role_id' => $programHeadRoleId]);
    $this->fmMajor->update(['program_head_user_id' => $this->fmHead->id]);

    $this->mmHead = User::factory()->create(['role_id' => $programHeadRoleId]);
    $this->mmMajor->update(['program_head_user_id' => $this->mmHead->id]);

    $this->fmSection = Section::query()->create([
        'course_id' => $this->course->id,
        'course_major_id' => $this->fmMajor->id,
        'school_year_id' => $this->schoolYear->id,
        'name' => '4A',
        'is_active' => true,
    ]);

    $this->mmSection = Section::query()->create([
        'course_id' => $this->course->id,
        'course_major_id' => $this->mmMajor->id,
        'school_year_id' => $this->schoolYear->id,
        'name' => '4B',
        'is_active' => true,
    ]);
});

it('scopes sections and students to a program head major', function () {
    Student::query()->create([
        'user_id' => User::factory()->create()->id,
        'section_id' => $this->fmSection->id,
        'student_number' => 'FM-001',
        'first_name' => 'FM',
        'last_name' => 'Student',
        'is_active' => true,
    ]);

    Student::query()->create([
        'user_id' => User::factory()->create()->id,
        'section_id' => $this->mmSection->id,
        'student_number' => 'MM-001',
        'first_name' => 'MM',
        'last_name' => 'Student',
        'is_active' => true,
    ]);

    $this->actingAs($this->fmHead)
        ->get(route('deans.sections.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('deans/sections')
            ->has('sections', 1)
            ->where('sections.0.id', $this->fmSection->id)
            ->where('course.portal_role', 'program_head')
            ->where('course.major.id', $this->fmMajor->id));

    $this->actingAs($this->fmHead)
        ->get(route('deans.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('deans/dashboard')
            ->where('stats.students', 1)
            ->where('course.portal_role', 'program_head'));

    $this->actingAs($this->fmHead)
        ->get(route('deans.students.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('deans/students')
            ->has('students', 1)
            ->where('students.0.student_number', 'FM-001'));
});

it('allows a college dean to see all majors within the course', function () {
    $this->actingAs($this->collegeDean)
        ->get(route('deans.sections.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('deans/sections')
            ->has('sections', 2)
            ->has('majors', 2)
            ->where('course.portal_role', 'dean')
            ->where('course.major', null));

    $this->actingAs($this->collegeDean)
        ->get(route('deans.school-years.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('deans/school-years')
            ->where('schoolYears', fn ($schoolYears) => collect($schoolYears)
                ->firstWhere('name', '2025-2026')['sections_count'] === 2));
});

it('auto-assigns major when a program head creates a section', function () {
    $this->actingAs($this->fmHead)
        ->post(route('deans.sections.store'), [
            'school_year_id' => $this->schoolYear->id,
            'name' => '4C',
            'is_active' => '1',
        ])
        ->assertRedirect(route('deans.sections.index'));

    $section = Section::query()
        ->where('course_id', $this->course->id)
        ->where('name', '4C')
        ->first();

    expect($section)->not->toBeNull();
    expect($section?->course_major_id)->toBe($this->fmMajor->id);
});

it('blocks a program head from accessing another major section', function () {
    $this->actingAs($this->fmHead)
        ->patch(route('deans.sections.update', $this->mmSection), [
            'school_year_id' => $this->schoolYear->id,
            'name' => '4B',
            'is_active' => '1',
        ])
        ->assertForbidden();
});

it('renders dean portal pages for program heads', function () {
    $this->actingAs($this->fmHead)
        ->get(route('deans.dashboard'))
        ->assertOk();

    $this->actingAs($this->fmHead)
        ->get(route('deans.school-years.index'))
        ->assertOk();

    $this->actingAs($this->fmHead)
        ->get(route('deans.students.index'))
        ->assertOk();

    $this->actingAs($this->fmHead)
        ->get(route('deans.sections.index'))
        ->assertOk();

    $this->actingAs($this->fmHead)
        ->get(route('deans.coordinators.index'))
        ->assertOk();
});
