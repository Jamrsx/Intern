<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Supervisor\SubmitOjtEvaluationRequest;
use App\Models\OjtEvaluation;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

class OjtEvaluationController extends Controller
{
    public function update(SubmitOjtEvaluationRequest $request, OjtEvaluation $evaluation): RedirectResponse
    {
        $evaluation->update([
            'rating' => $request->validated('rating'),
            'comments' => $request->validated('comments'),
            'evaluation_date' => $request->validated('evaluation_date'),
            'status' => OjtEvaluation::STATUS_COMPLETED,
            'submitted_at' => now(),
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Evaluation submitted successfully.',
        ]);

        return redirect()->route('supervisors.dashboard');
    }
}
