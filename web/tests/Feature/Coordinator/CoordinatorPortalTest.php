<?php

use App\Models\Company;
use App\Models\Course;
use App\Models\Department;
use App\Models\DocumentType;
use App\Models\OjtSchedule;
use App\Models\Role;
use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use App\Models\StudentDocument;
use App\Models\Supervisor;
use App\Models\TimeLog;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Database\Seeders\SchoolYearSeeder;
use Illuminate\Support\Facades\Storage;

it('redirects coordinators to the coordinator dashboard after login', function () {
    $this->seed(RoleSeeder::class);

    $coordinator = User::factory()->create([
        'role_id' => Role::query()->where('name', 'coordinator')->value('id'),
    ]);

    $this->actingAs($coordinator)
        ->get(route('dashboard'))
        ->assertRedirect(route('coordinators.dashboard'));
});

it('shows the coordinator dashboard with section stats', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'section' => $section] = createCoordinatorWithSection();

    $this->actingAs($coordinator)
        ->get(route('coordinators.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coordinator/dashboard')
            ->where('section.id', $section->id)
            ->where('stats.students', 1)
            ->where('stats.assigned', 0)
            ->where('stats.unassigned', 1));
});

it('allows a coordinator to assign a student to a company', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'student' => $student, 'section' => $section, 'course' => $course] = createCoordinatorWithSection();

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

    $supervisorUser = User::factory()->create([
        'role_id' => Role::query()->where('name', 'supervisor')->value('id'),
    ]);

    $supervisor = Supervisor::query()->create([
        'user_id' => $supervisorUser->id,
        'company_id' => $company->id,
        'department_id' => $department->id,
        'position_title' => 'HR Supervisor',
        'is_active' => true,
    ]);

    $this->actingAs($coordinator)
        ->from(route('coordinators.students.show', $student))
        ->patch(route('coordinators.students.update', $student), [
            'company_id' => $company->id,
            'department_id' => $department->id,
            'supervisor_id' => $supervisor->id,
        ])
        ->assertRedirect(route('coordinators.students.show', $student));

    $student->refresh();

    expect($student->company_id)->toBe($company->id);
    expect($student->department_id)->toBe($department->id);
    expect($student->supervisor_id)->toBe($supervisor->id);
});

it('blocks coordinators from updating students outside their section', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator] = createCoordinatorWithSection();

    $otherSection = Section::query()->create([
        'course_id' => Course::query()->first()->id,
        'school_year_id' => SchoolYear::query()->where('name', '2025-2026')->value('id'),
        'name' => '4B',
        'is_active' => true,
    ]);

    $otherStudentUser = User::factory()->create([
        'role_id' => Role::query()->where('name', 'intern')->value('id'),
    ]);

    $otherStudent = Student::query()->create([
        'user_id' => $otherStudentUser->id,
        'student_number' => '2022-1-04399',
        'first_name' => 'Jane',
        'last_name' => 'Smith',
        'section_id' => $otherSection->id,
        'is_active' => true,
    ]);

    $company = Company::query()->create([
        'course_id' => Course::query()->first()->id,
        'name' => 'Test Company',
        'address' => 'Test Address',
        'is_active' => true,
    ]);

    $this->actingAs($coordinator)
        ->patch(route('coordinators.students.update', $otherStudent), [
            'company_id' => $company->id,
        ])
        ->assertForbidden();
});

it('blocks non-coordinators from coordinator routes', function () {
    $this->seed(RoleSeeder::class);

    $dean = User::factory()->create([
        'role_id' => Role::query()->where('name', 'dean')->value('id'),
    ]);

    $this->actingAs($dean)
        ->get(route('coordinators.dashboard'))
        ->assertForbidden();

    $this->actingAs($dean)
        ->get(route('coordinators.students.index'))
        ->assertForbidden();
});

it('shows student detail with progress and documents for coordinators', function () {
    Storage::fake('local');

    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator, 'student' => $student, 'course' => $course] = createCoordinatorWithSection();

    TimeLog::query()->create([
        'student_id' => $student->id,
        'time_in' => now()->subDays(2)->setTime(8, 0),
        'time_out' => now()->subDays(2)->setTime(17, 0),
        'duration_minutes' => 480,
    ]);

    OjtSchedule::query()->create([
        'student_id' => $student->id,
        'hours_per_day' => 8,
        'days_per_week' => 5,
        'start_date' => now()->subWeek()->toDateString(),
    ]);

    $documentType = DocumentType::query()->create([
        'code' => 'weekly_report',
        'name' => 'Weekly Report',
        'is_required' => true,
    ]);

    Storage::disk('local')->put('student-documents/sample.pdf', 'sample pdf content');

    $document = StudentDocument::query()->create([
        'student_id' => $student->id,
        'document_type_id' => $documentType->id,
        'file_path' => 'student-documents/sample.pdf',
        'original_filename' => 'week-1-report.pdf',
        'file_size' => 1024,
        'mime_type' => 'application/pdf',
        'uploaded_at' => now(),
    ]);

    $this->actingAs($coordinator)
        ->get(route('coordinators.students.show', $student))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('coordinator/students/show')
            ->where('student.id', $student->id)
            ->where('progress.required_hours', $course->required_hours)
            ->where('progress.rendered_hours', 8)
            ->where('progress.remaining_hours', 478)
            ->where('progress.time_log_count', 1)
            ->has('documents', 1)
            ->where('documents.0.id', $document->id));

    $this->actingAs($coordinator)
        ->get(route('coordinators.students.documents.show', [
            'student' => $student,
            'document' => $document,
        ]))
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');
});

it('blocks coordinators from viewing students outside their section', function () {
    $this->seed(RoleSeeder::class);
    $this->seed(SchoolYearSeeder::class);

    ['coordinator' => $coordinator] = createCoordinatorWithSection();

    $otherSection = Section::query()->create([
        'course_id' => Course::query()->first()->id,
        'school_year_id' => SchoolYear::query()->where('name', '2025-2026')->value('id'),
        'name' => '4B',
        'is_active' => true,
    ]);

    $otherStudentUser = User::factory()->create([
        'role_id' => Role::query()->where('name', 'intern')->value('id'),
    ]);

    $otherStudent = Student::query()->create([
        'user_id' => $otherStudentUser->id,
        'student_number' => '2022-1-04400',
        'first_name' => 'Alex',
        'last_name' => 'Rivera',
        'section_id' => $otherSection->id,
        'is_active' => true,
    ]);

    $this->actingAs($coordinator)
        ->get(route('coordinators.students.show', $otherStudent))
        ->assertNotFound();
});
