<?php

namespace App\Http\Controllers\Dean;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Student;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

        $course = Course::query()
            ->where('dean_user_id', $userId)
            ->first();

        $studentsCount = 0;

        if ($course) {
            $studentsCount = (int) Student::query()
                ->join('sections', 'students.section_id', '=', 'sections.id')
                ->where('sections.course_id', $course->id)
                ->count();
        }

        return Inertia::render('deans/dashboard', [
            'course' => $course ? [
                'id' => $course->id,
                'code' => $course->code,
                'name' => $course->name,
                'required_hours' => $course->required_hours,
                'is_active' => $course->is_active,
            ] : null,
            'stats' => [
                'students' => $studentsCount,
            ],
        ]);
    }
}
