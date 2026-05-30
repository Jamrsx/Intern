<?php

namespace App\Http\Controllers\Dean\Concerns;

use App\Models\Company;
use App\Models\Course;
use Illuminate\Http\Request;

trait ResolvesDeanCourse
{
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

    private function ensureCompanyBelongsToCourse(Company $company, Course $course): void
    {
        abort_unless($company->course_id === $course->id, 404);
    }
}
