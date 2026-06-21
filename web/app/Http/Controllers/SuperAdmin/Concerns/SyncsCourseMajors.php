<?php

namespace App\Http\Controllers\SuperAdmin\Concerns;

use App\Models\Course;

trait SyncsCourseMajors
{
    /**
     * @param  list<array{name: string, code?: string|null, program_head_name?: string|null}>  $majors
     */
    protected function syncCourseMajors(Course $course, array $majors): void
    {
        $course->majors()->delete();

        foreach ($majors as $index => $major) {
            $course->majors()->create([
                'name' => $major['name'],
                'code' => $major['code'] ?? null,
                'program_head_name' => $major['program_head_name'] ?? null,
                'sort_order' => $index,
            ]);
        }
    }
}
