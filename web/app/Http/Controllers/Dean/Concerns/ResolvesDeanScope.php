<?php

namespace App\Http\Controllers\Dean\Concerns;

use App\Models\Course;
use App\Models\CourseMajor;
use App\Models\Section;
use App\Support\DeanPortalScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

trait ResolvesDeanScope
{
    protected function deanCourse(Request $request): ?Course
    {
        $user = $request->user();

        return $user ? DeanPortalScope::course($user) : null;
    }

    protected function deanCourseOrFail(Request $request): Course
    {
        $course = $this->deanCourse($request);

        abort_if($course === null, 403, 'You are not assigned to a course or program yet.');

        return $course;
    }

    protected function deanMajor(Request $request): ?CourseMajor
    {
        $user = $request->user();

        return $user ? DeanPortalScope::major($user) : null;
    }

    /**
     * @return Builder<Section>
     */
    protected function deanSectionsQuery(Request $request): Builder
    {
        $user = $request->user();

        if ($user === null) {
            return Section::query()->whereRaw('1 = 0');
        }

        return DeanPortalScope::sectionsQuery($user);
    }

    protected function ensureSectionInDeanScope(Section $section, Request $request): void
    {
        $user = $request->user();

        abort_unless(
            $user !== null && DeanPortalScope::sectionBelongsToScope($user, $section),
            404,
        );
    }

    protected function resolveSectionMajorId(Request $request, ?int $requestedMajorId = null): ?int
    {
        $assignedMajor = $this->deanMajor($request);

        if ($assignedMajor !== null) {
            return $assignedMajor->id;
        }

        return $requestedMajorId;
    }

    /**
     * @return array<string, mixed>|null
     */
    protected function deanPortalContextPayload(Request $request): ?array
    {
        $user = $request->user();

        return $user ? DeanPortalScope::coursePayload($user) : null;
    }
}
