<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\Section;
use App\Models\Student;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

        $section = Section::query()
            ->with([
                'course:id,code,name,required_hours',
                'schoolYear:id,name,is_active',
            ])
            ->where('coordinator_user_id', $userId)
            ->where('is_active', true)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_active', true))
            ->first();

        $studentsCount = 0;
        $assignedCount = 0;

        if ($section) {
            $studentsCount = (int) Student::query()
                ->where('section_id', $section->id)
                ->where('is_active', true)
                ->count();

            $assignedCount = (int) Student::query()
                ->where('section_id', $section->id)
                ->where('is_active', true)
                ->whereNotNull('company_id')
                ->count();
        }

        return Inertia::render('coordinator/dashboard', [
            'section' => $section ? [
                'id' => $section->id,
                'name' => $section->name,
                'display_name' => trim("{$section->course->code} {$section->name}"),
                'school_year' => $section->schoolYear?->name,
                'course' => [
                    'code' => $section->course->code,
                    'name' => $section->course->name,
                    'required_hours' => $section->course->required_hours,
                ],
            ] : null,
            'stats' => [
                'students' => $studentsCount,
                'assigned' => $assignedCount,
                'unassigned' => max($studentsCount - $assignedCount, 0),
            ],
        ]);
    }
}
