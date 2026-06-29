<?php

namespace App\Http\Controllers\Dean;

use App\Http\Controllers\Concerns\ResolvesDeanPortalPresentation;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Dean\Concerns\ResolvesDeanScope;
use App\Http\Requests\Dean\StoreSectionRequest;
use App\Http\Requests\Dean\UpdateSectionRequest;
use App\Models\CourseMajor;
use App\Models\SchoolYear;
use App\Models\Section;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SectionController extends Controller
{
    use ResolvesDeanPortalPresentation;
    use ResolvesDeanScope;

    public function index(Request $request): Response
    {
        $course = $this->deanCourse($request);

        $schoolYears = SchoolYear::query()
            ->where('is_active', true)
            ->orderByDesc('name')
            ->get(['id', 'name', 'is_active']);

        $sections = collect();

        if ($course !== null) {
            $sections = $this->deanSectionsQuery($request)
                ->with([
                    'schoolYear:id,name,is_active',
                    'courseMajor:id,code,name',
                ])
                ->withCount('students')
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
                    'course_major' => $section->courseMajor ? [
                        'id' => $section->courseMajor->id,
                        'code' => $section->courseMajor->code,
                        'name' => $section->courseMajor->name,
                        'display_name' => trim(
                            ($section->courseMajor->code
                                ? "{$course->code}-{$section->courseMajor->code}"
                                : $course->code)
                            .' — '
                            .$section->courseMajor->name,
                        ),
                    ] : null,
                    'students_count' => $section->students_count,
                    'is_active' => $section->is_active,
                    'created_at' => $section->created_at?->toIso8601String(),
                ]);
        }

        $majors = $course === null
            ? []
            : CourseMajor::query()
                ->where('course_id', $course->id)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
                ->map(fn (CourseMajor $major) => [
                    'id' => $major->id,
                    'code' => $major->code,
                    'name' => $major->name,
                    'display_name' => trim(
                        ($major->code ? "{$course->code}-{$major->code}" : $course->code)
                        .' — '
                        .$major->name,
                    ),
                ])
                ->values()
                ->all();

        return $this->deanPortalRender('sections', [
            'course' => $this->deanPortalContextPayload($request),
            'majors' => $majors,
            'schoolYears' => $schoolYears,
            'sections' => $sections,
        ]);
    }

    public function store(StoreSectionRequest $request): RedirectResponse
    {
        $course = $this->deanCourseOrFail($request);
        $majorId = $this->resolveSectionMajorId(
            $request,
            $request->integer('course_major_id') ?: null,
        );

        if ($majorId !== null) {
            abort_unless(
                CourseMajor::query()
                    ->whereKey($majorId)
                    ->where('course_id', $course->id)
                    ->exists(),
                422,
                'The selected program does not belong to your course.',
            );
        }

        Section::query()->create([
            'course_id' => $course->id,
            'course_major_id' => $majorId,
            'school_year_id' => $request->validated('school_year_id'),
            'name' => $request->validated('name'),
            'code' => $request->validated('code'),
            'is_active' => $request->boolean('is_active', true),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Section created successfully.',
        ]);

        return $this->deanPortalRedirect('sections.index');
    }

    public function update(UpdateSectionRequest $request, Section $section): RedirectResponse
    {
        $this->ensureSectionInDeanScope($section, $request);

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

        return $this->deanPortalRedirect('sections.index');
    }

    public function destroy(Request $request, Section $section): RedirectResponse
    {
        $this->ensureSectionInDeanScope($section, $request);

        if ($section->students()->exists()) {
            Inertia::flash('toast', [
                'type' => 'error',
                'message' => 'Cannot deactivate a section that has students assigned.',
            ]);

            return $this->deanPortalRedirect('sections.index');
        }

        $section->update(['is_active' => false]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Section deactivated.',
        ]);

        return $this->deanPortalRedirect('sections.index');
    }
}
