<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Role;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $deanRoleId = Role::query()->where('name', 'dean')->value('id');

        return Inertia::render('superAdmin/dashboard', [
            'stats' => [
                'courses' => Course::query()->count(),
                'active_courses' => Course::query()->where('is_active', true)->count(),
                'deans' => $deanRoleId
                    ? User::query()->where('role_id', $deanRoleId)->count()
                    : 0,
                'unassigned_courses' => Course::query()->whereNull('dean_user_id')->count(),
            ],
        ]);
    }
}
