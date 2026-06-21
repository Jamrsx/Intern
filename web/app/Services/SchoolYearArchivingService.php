<?php

namespace App\Services;

use App\Models\SchoolYear;
use App\Models\Section;
use App\Models\Student;
use Illuminate\Support\Facades\DB;

class SchoolYearArchivingService
{
    public function archive(SchoolYear $schoolYear): int
    {
        return DB::transaction(function () use ($schoolYear): int {
            $sectionIds = $schoolYear->sections()->pluck('id');

            if ($sectionIds->isEmpty()) {
                return 0;
            }

            Section::query()
                ->whereIn('id', $sectionIds)
                ->update(['is_active' => false]);

            $students = Student::query()
                ->whereIn('section_id', $sectionIds)
                ->with('user:id,is_active')
                ->get();

            $archivedCount = 0;

            foreach ($students as $student) {
                if ($student->is_active) {
                    $student->update(['is_active' => false]);
                }

                if ($student->user && $student->user->is_active) {
                    $student->user->update(['is_active' => false]);
                }

                $archivedCount++;
            }

            return $archivedCount;
        });
    }
}
