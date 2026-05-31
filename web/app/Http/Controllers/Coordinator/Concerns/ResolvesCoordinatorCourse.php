<?php

namespace App\Http\Controllers\Coordinator\Concerns;

use App\Models\Company;
use App\Models\Course;
use App\Models\Section;
use Illuminate\Http\Request;

trait ResolvesCoordinatorCourse
{
    private function coordinatorCourse(Request $request): ?Course
    {
        return $this->coordinatorSection($request)?->course;
    }

    private function coordinatorCourseOrFail(Request $request): Course
    {
        $course = $this->coordinatorCourse($request);

        abort_if($course === null, 403, 'You are not assigned to a section yet.');

        return $course;
    }

    private function coordinatorSection(Request $request): ?Section
    {
        return Section::query()
            ->with('course')
            ->where('coordinator_user_id', $request->user()->id)
            ->where('is_active', true)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_active', true))
            ->first();
    }

    private function coordinatorSectionOrFail(Request $request): Section
    {
        $section = $this->coordinatorSection($request);

        abort_if($section === null, 403, 'You are not assigned to a section yet.');

        return $section;
    }

    private function ensureCompanyBelongsToSection(Company $company, Section $section): void
    {
        abort_unless($company->section_id === $section->id, 404);
    }

    private function ensureCompanyBelongsToCourse(Company $company, Course $course): void
    {
        abort_unless($company->course_id === $course->id, 404);
    }
}
