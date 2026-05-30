<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Models\OjtEvaluation;
use App\Models\Section;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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

        $this->openEvaluation($student, $request->user()->id);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Evaluation opened. The company supervisor can now rate this intern.',
        ]);

        return redirect()->back();
    }

    public function storeAll(Request $request): RedirectResponse
    {
        $section = $this->coordinatorSectionOrFail($request);
        $userId = $request->user()->id;

        $activeStudents = Student::query()
            ->where('section_id', $section->id)
            ->where('is_active', true)
            ->get();

        $eligibleStudents = $activeStudents->filter(function (Student $student): bool {
            if ($student->supervisor_id === null) {
                return false;
            }

            return ! OjtEvaluation::query()
                ->where('student_id', $student->id)
                ->where('status', OjtEvaluation::STATUS_PENDING)
                ->exists();
        });

        if ($eligibleStudents->isEmpty()) {
            $withoutSupervisor = $activeStudents->whereNull('supervisor_id')->count();

            $message = $withoutSupervisor > 0
                ? 'No evaluations were opened. Assign supervisors to students first, or wait until pending evaluations are completed.'
                : 'No evaluations were opened. All assigned students already have a pending evaluation.';

            Inertia::flash('toast', [
                'type' => 'error',
                'message' => $message,
            ]);

            return redirect()->back();
        }

        DB::transaction(function () use ($eligibleStudents, $userId): void {
            foreach ($eligibleStudents as $student) {
                $this->openEvaluation($student, $userId);
            }
        });

        $openedCount = $eligibleStudents->count();
        $skippedNoSupervisor = $activeStudents->whereNull('supervisor_id')->count();
        $skippedPending = $activeStudents->whereNotNull('supervisor_id')->count() - $openedCount;

        $message = "Opened evaluations for {$openedCount} student(s).";

        if ($skippedNoSupervisor > 0) {
            $message .= " {$skippedNoSupervisor} skipped (no supervisor assigned).";
        }

        if ($skippedPending > 0) {
            $message .= " {$skippedPending} skipped (evaluation already pending).";
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $message,
        ]);

        return redirect()->back();
    }

    private function openEvaluation(Student $student, int $openedByUserId): void
    {
        OjtEvaluation::query()->create([
            'student_id' => $student->id,
            'supervisor_id' => $student->supervisor_id,
            'opened_by_user_id' => $openedByUserId,
            'status' => OjtEvaluation::STATUS_PENDING,
            'opened_at' => now(),
        ]);
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
