<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\OjtEvaluation;
use App\Models\Section;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OjtEvaluationController extends Controller
{
    public function store(Request $request, Student $student): RedirectResponse
    {
        $section = $this->coordinatorSectionOrFail($request);
        $this->ensureStudentInSection($student, $section);

        abort_unless(
            $student->supervisor_id !== null,
            422,
            'Assign a supervisor before opening an evaluation.',
        );

        $hasPending = OjtEvaluation::query()
            ->where('student_id', $student->id)
            ->where('status', OjtEvaluation::STATUS_PENDING)
            ->exists();

        abort_if($hasPending, 422, 'This student already has a pending evaluation.');

        OjtEvaluation::query()->create([
            'student_id' => $student->id,
            'supervisor_id' => $student->supervisor_id,
            'opened_by_user_id' => $request->user()->id,
            'status' => OjtEvaluation::STATUS_PENDING,
            'opened_at' => now(),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Evaluation opened. The company supervisor can now rate this intern.',
        ]);

        return redirect()->back();
    }

    private function coordinatorSectionOrFail(Request $request): Section
    {
        $section = Section::query()
            ->where('coordinator_user_id', $request->user()->id)
            ->where('is_active', true)
            ->whereHas('schoolYear', fn ($query) => $query->where('is_active', true))
            ->first();

        abort_if($section === null, 403, 'You are not assigned to a section yet.');

        return $section;
    }

    private function ensureStudentInSection(Student $student, Section $section): void
    {
        $student->loadMissing('section');

        abort_unless($student->section_id === $section->id, 404);
    }
}
