<?php

namespace App\Http\Controllers\Coordinator;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Coordinator\Concerns\ResolvesCoordinatorCourse;
use App\Support\EvaluationAlertService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EvaluationAlertController extends Controller
{
    use ResolvesCoordinatorCourse;

    public function markCompletedSeen(Request $request): RedirectResponse
    {
        $section = $this->coordinatorSectionOrFail($request);

        EvaluationAlertService::markCoordinatorCompletedSeen($section);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Completed evaluation alerts marked as seen.',
        ]);

        return redirect()->back();
    }
}
