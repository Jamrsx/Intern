<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\Supervisor;
use App\Support\OjtProgressCalculator;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

        $supervisor = Supervisor::query()
            ->with([
                'user:id,name',
                'company:id,name',
                'department:id,name',
            ])
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->first();

        $interns = [];
        $totalRenderedHours = 0.0;

        if ($supervisor !== null) {
            $students = Student::query()
                ->where('supervisor_id', $supervisor->id)
                ->where('is_active', true)
                ->with([
                    'section.course:id,code,name,required_hours',
                    'section.schoolYear:id,name',
                ])
                ->orderBy('last_name')
                ->orderBy('first_name')
                ->get();

            foreach ($students as $student) {
                $requiredHours = (int) ($student->section?->course?->required_hours ?? 0);
                $progress = OjtProgressCalculator::forStudent($student, $requiredHours);
                $totalRenderedHours += (float) $progress['rendered_hours'];

                $interns[] = [
                    'id' => $student->id,
                    'full_name' => $student->fullName(),
                    'student_number' => $student->student_number,
                    'section' => $student->section ? [
                        'display_name' => trim(
                            ($student->section->course?->code ?? '').' '.$student->section->name
                        ),
                        'school_year' => $student->section->schoolYear?->name,
                    ] : null,
                    'progress' => $progress,
                ];
            }
        }

        return Inertia::render('supervisor/dashboard', [
            'supervisor' => $supervisor ? [
                'id' => $supervisor->id,
                'name' => $supervisor->user->name,
                'position_title' => $supervisor->position_title,
                'company' => $supervisor->company ? [
                    'id' => $supervisor->company->id,
                    'name' => $supervisor->company->name,
                ] : null,
                'department' => $supervisor->department ? [
                    'id' => $supervisor->department->id,
                    'name' => $supervisor->department->name,
                ] : null,
            ] : null,
            'stats' => [
                'interns' => count($interns),
                'total_rendered_hours' => round($totalRenderedHours, 2),
            ],
            'interns' => $interns,
        ]);
    }
}
