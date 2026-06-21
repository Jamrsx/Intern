<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\SuperAdmin\Concerns\SyncsCourseMajors;
use App\Http\Requests\SuperAdmin\StoreCourseRequest;
use App\Http\Requests\SuperAdmin\UpdateCourseRequest;
use App\Models\Course;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class CourseController extends Controller
{
    use SyncsCourseMajors;

    public function index(): Response
    {
        $deanRoleId = Role::query()->where('name', 'dean')->value('id');

        $courses = Course::query()
            ->with(['dean:id,name,email', 'majors'])
            ->orderBy('code')
            ->get()
            ->map(fn (Course $course) => [
                'id' => $course->id,
                'code' => $course->code,
                'name' => $course->name,
                'required_hours' => $course->required_hours,
                'is_active' => $course->is_active,
                'dean' => $course->dean ? [
                    'id' => $course->dean->id,
                    'name' => $course->dean->name,
                    'email' => $course->dean->email,
                ] : null,
                'majors' => $course->majors->map(fn ($major) => [
                    'id' => $major->id,
                    'name' => $major->name,
                    'code' => $major->code,
                    'program_head_name' => $major->program_head_name,
                ])->values()->all(),
                'created_at' => $course->created_at?->toIso8601String(),
            ]);

        $deansForAssignment = User::query()
            ->where('role_id', $deanRoleId)
            ->where('is_active', true)
            ->with('courseAsDean:id,code,name,dean_user_id')
            ->orderBy('name')
            ->get()
            ->map(fn (User $dean) => [
                'id' => $dean->id,
                'name' => $dean->name,
                'email' => $dean->email,
                'assigned_course' => $dean->courseAsDean ? [
                    'id' => $dean->courseAsDean->id,
                    'code' => $dean->courseAsDean->code,
                    'name' => $dean->courseAsDean->name,
                ] : null,
            ]);

        return Inertia::render('superAdmin/courses', [
            'courses' => $courses,
            'deansForAssignment' => $deansForAssignment,
        ]);
    }

    public function store(StoreCourseRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $majors = $data['majors'] ?? [];
        unset($data['majors']);

        $course = Course::query()->create($data);
        $this->syncCourseMajors($course, $majors);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Course created successfully.',
        ]);

        return redirect()->route('superadmin.courses.index');
    }

    public function update(UpdateCourseRequest $request, Course $course): RedirectResponse
    {
        $data = $request->validated();
        $majors = $data['majors'] ?? [];
        unset($data['majors']);

        $course->update($data);
        $this->syncCourseMajors($course, $majors);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Course updated successfully.',
        ]);

        return redirect()->route('superadmin.courses.index');
    }

    public function destroy(Course $course): RedirectResponse
    {
        $course->update(['is_active' => false]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Course deactivated.',
        ]);

        return redirect()->route('superadmin.courses.index');
    }
}
