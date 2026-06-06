<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\UpdateInternScheduleRequest;
use App\Models\Student;
use App\Support\OjtProgressCalculator;
use App\Support\OjtSchedulePersister;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InternProgressController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('intern')) {
            abort(403, 'This endpoint is for intern accounts only.');
        }

        $student = Student::query()
            ->with([
                'section.course:id,code,name,required_hours',
            ])
            ->where('user_id', $user->id)
            ->firstOrFail();

        $course = $student->section?->course;
        $requiredHours = (int) ($course?->required_hours ?? 0);
        $progress = OjtProgressCalculator::forStudent($student, $requiredHours);

        return response()->json([
            'student' => [
                'id' => $student->id,
                'student_number' => $student->student_number,
                'full_name' => $student->fullName(),
            ],
            'course' => $course ? [
                'id' => $course->id,
                'code' => $course->code,
                'name' => $course->name,
                'required_hours' => $course->required_hours,
            ] : null,
            'progress' => $progress,
        ]);
    }

    public function updateSchedule(UpdateInternScheduleRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $student = Student::query()
            ->with([
                'section.course:id,code,name,required_hours',
            ])
            ->where('user_id', $user->id)
            ->firstOrFail();

        OjtSchedulePersister::upsert(
            $student,
            (float) $validated['hours_per_day'],
            (int) $validated['days_per_week'],
        );

        $course = $student->section?->course;
        $requiredHours = (int) ($course?->required_hours ?? 0);
        $progress = OjtProgressCalculator::forStudent($student, $requiredHours);

        return response()->json([
            'message' => 'OJT schedule saved.',
            'progress' => $progress,
        ]);
    }
}
