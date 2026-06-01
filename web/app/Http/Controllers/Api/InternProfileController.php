<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InternProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasRole('intern')) {
            abort(403, 'This endpoint is for intern accounts only.');
        }

        $student = Student::query()
            ->with([
                'company:id,name,address',
                'department:id,name,company_id',
                'supervisor.user:id,name,email',
                'supervisor:id,user_id,position_title,company_id,department_id',
                'section:id,name,course_id',
                'section.course:id,code,name',
            ])
            ->where('user_id', $user->id)
            ->firstOrFail();

        $supervisor = $student->supervisor;

        return response()->json([
            'student' => [
                'id' => $student->id,
                'student_number' => $student->student_number,
                'full_name' => $student->fullName(),
            ],
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'section' => $student->section ? [
                'id' => $student->section->id,
                'name' => $student->section->name,
                'course' => $student->section->course ? [
                    'code' => $student->section->course->code,
                    'name' => $student->section->course->name,
                ] : null,
            ] : null,
            'placement' => [
                'company' => $student->company ? [
                    'id' => $student->company->id,
                    'name' => $student->company->name,
                    'address' => $student->company->address,
                ] : null,
                'department' => $student->department ? [
                    'id' => $student->department->id,
                    'name' => $student->department->name,
                ] : null,
                'supervisor' => $supervisor ? [
                    'id' => $supervisor->id,
                    'name' => $supervisor->user?->name,
                    'email' => $supervisor->user?->email,
                    'position_title' => $supervisor->position_title,
                ] : null,
            ],
        ]);
    }
}
