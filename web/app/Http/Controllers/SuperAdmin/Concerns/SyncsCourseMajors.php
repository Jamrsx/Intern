<?php

namespace App\Http\Controllers\SuperAdmin\Concerns;

use App\Models\Course;

trait SyncsCourseMajors
{
    /**
     * @param  list<array{name: string, code?: string|null}>  $majors
     */
    protected function syncCourseMajors(Course $course, array $majors): void
    {
        $course->majors()->delete();

        foreach ($majors as $index => $major) {
            $course->majors()->create([
                'name' => $major['name'],
                'code' => $major['code'] ?? null,
                'sort_order' => $index,
            ]);
        }
    }
}
