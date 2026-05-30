<?php

namespace App\Http\Controllers\Dean;

use App\Http\Controllers\Controller;
use App\Http\Requests\Dean\StoreSectionRequest;
use App\Http\Requests\Dean\UpdateSectionRequest;
use App\Models\Course;
use App\Models\SchoolYear;
use App\Models\Section;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SectionController extends Controller
{
    public function index(Request $request): Response
    {
        $course = $this->deanCourse($request);

        $schoolYears = SchoolYear::query()
            ->where('is_active', true)
            ->orderByDesc('name')
            ->get(['id', 'name', 'is_active']);

        $sections = collect();

        if ($course !== null) {
            $sections = Section::query()
                ->with('schoolYear:id,name,is_active')
                ->withCount('students')
                ->where('course_id', $course->id)
                ->whereHas('schoolYear', fn ($query) => $query->where('is_active', true))
                ->orderBy('name')
                ->get()
                ->map(fn (Section $section) => [
                    'id' => $section->id,
                    'name' => $section->name,
                    'code' => $section->code,
                    'display_name' => trim("{$course->code} {$section->name}"),
                    'school_year_id' => $section->school_year_id,
                    'school_year' => $section->schoolYear ? [
                        'id' => $section->schoolYear->id,
                        'name' => $section->schoolYear->name,
                        'is_active' => $section->schoolYear->is_active,
                    ] : null,
                    'students_count' => $section->students_count,
                    'is_active' => $section->is_active,
                    'created_at' => $section->created_at?->toIso8601String(),
                ]);
        }

        return Inertia::render('deans/sections', [
            'course' => $course ? [
                'id' => $course->id,
                'code' => $course->code,
                'name' => $course->name,
            ] : null,
            'schoolYears' => $schoolYears,
            'sections' => $sections,
        ]);
    }

    public function store(StoreSectionRequest $request): RedirectResponse
    {
        $course = $this->deanCourseOrFail($request);

        Section::query()->create([
            'course_id' => $course->id,
            'school_year_id' => $request->validated('school_year_id'),
            'name' => $request->validated('name'),
            'code' => $request->validated('code'),
            'is_active' => $request->boolean('is_active', true),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Section created successfully.',
        ]);

        return redirect()->route('deans.sections.index');
    }

    public function update(UpdateSectionRequest $request, Section $section): RedirectResponse
    {
        $section->update([
            'school_year_id' => $request->validated('school_year_id'),
            'name' => $request->validated('name'),
            'code' => $request->validated('code'),
            'is_active' => $request->boolean('is_active'),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Section updated successfully.',
        ]);

        return redirect()->route('deans.sections.index');
    }

    public function destroy(Request $request, Section $section): RedirectResponse
    {
        $course = $this->deanCourseOrFail($request);
        abort_unless($section->course_id === $course->id, 404);

        if ($section->students()->exists()) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Cannot deactivate a section that has students assigned.',
            ]);

            return redirect()->route('deans.sections.index');
        }

        $section->update(['is_active' => false]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Section deactivated.',
        ]);

        return redirect()->route('deans.sections.index');
    }

    private function deanCourse(Request $request): ?Course
    {
        return Course::query()
            ->where('dean_user_id', $request->user()->id)
            ->first();
    }

    private function deanCourseOrFail(Request $request): Course
    {
        $course = $this->deanCourse($request);

        abort_if($course === null, 403, 'You are not assigned to a course yet.');

        return $course;
    }
}
