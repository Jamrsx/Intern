<?php

namespace App\Http\Controllers\Dean;

use App\Http\Controllers\Concerns\ResolvesDeanPortalPresentation;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Dean\Concerns\ResolvesDeanScope;
use App\Support\DeanPortalScope;
use Illuminate\Http\Request;
use Inertia\Response;

class DashboardController extends Controller
{
    use ResolvesDeanPortalPresentation;
    use ResolvesDeanScope;

    public function index(Request $request): Response
    {
        $user = $request->user();
        $courseContext = $this->deanPortalContextPayload($request);

        $studentsCount = 0;

        if ($user !== null && $courseContext !== null) {
            $studentsCount = (int) DeanPortalScope::studentsQuery($user)->count();
        }

        return $this->deanPortalRender('dashboard', [
            'course' => $courseContext,
            'stats' => [
                'students' => $studentsCount,
            ],
        ]);
    }
}
