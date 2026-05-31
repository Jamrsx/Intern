<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Coordinator\Concerns\ResolvesCoordinatorCourse;
use App\Http\Requests\Coordinator\OpenOjtEvaluationRequest;
use App\Models\OjtEvaluation;
use App\Models\OjtEvaluationTemplate;
use App\Models\Section;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class OjtEvaluationController extends Controller
{
    use ResolvesCoordinatorCourse;

    public function store(
        OpenOjtEvaluationRequest $request,
        Student $student,
    ): RedirectResponse {
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

        $template = OjtEvaluationTemplate::query()
            ->where('id', $request->validated('evaluation_template_id'))
            ->where('section_id', $section->id)
            ->where('is_active', true)
            ->firstOrFail();

        $this->openEvaluation($student, $request->user()->id, $template);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "“{$template->name}” sent to the company supervisor.",
        ]);

        return redirect()->back();
    }

    public function storeAll(OpenOjtEvaluationRequest $request): RedirectResponse
    {
        $section = $this->coordinatorSectionOrFail($request);
        $userId = $request->user()->id;

        $template = OjtEvaluationTemplate::query()
            ->where('id', $request->validated('evaluation_template_id'))
            ->where('section_id', $section->id)
            ->where('is_active', true)
            ->firstOrFail();

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

        DB::transaction(function () use ($eligibleStudents, $userId, $template): void {
            foreach ($eligibleStudents as $student) {
                $this->openEvaluation($student, $userId, $template);
            }
        });

        $openedCount = $eligibleStudents->count();
        $skippedNoSupervisor = $activeStudents->whereNull('supervisor_id')->count();
        $skippedPending = $activeStudents->whereNotNull('supervisor_id')->count() - $openedCount;

        $message = "Opened “{$template->name}” for {$openedCount} student(s).";

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

    private function openEvaluation(
        Student $student,
        int $openedByUserId,
        OjtEvaluationTemplate $template,
    ): void {
        OjtEvaluation::query()->create([
            'student_id' => $student->id,
            'supervisor_id' => $student->supervisor_id,
            'opened_by_user_id' => $openedByUserId,
            'evaluation_template_id' => $template->id,
            'status' => OjtEvaluation::STATUS_PENDING,
            'opened_at' => now(),
        ]);
    }

    private function ensureStudentInSection(Student $student, Section $section): void
    {
        $student->loadMissing('section');

        abort_unless($student->section_id === $section->id, 404);
    }
}
