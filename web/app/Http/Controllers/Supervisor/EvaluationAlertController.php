<?php

namespace App\Http\Controllers\Supervisor;

use App\Http\Controllers\Controller;
use App\Models\Supervisor;
use App\Support\EvaluationAlertService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class EvaluationAlertController extends Controller
{
    public function markPendingSeen(Request $request): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user !== null && $user->hasRole('supervisor'), 403);

        $supervisor = Supervisor::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->firstOrFail();

        EvaluationAlertService::markSupervisorPendingSeen($supervisor);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'New evaluation alerts marked as seen.',
        ]);

        return redirect()->back();
    }
}
