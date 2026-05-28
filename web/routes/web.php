<?php

use App\Http\Controllers\SuperAdmin\CourseController as SuperAdminCourseController;
use App\Http\Controllers\SuperAdmin\DashboardController as SuperAdminDashboardController;
use App\Http\Controllers\SuperAdmin\DeanController as SuperAdminDeanController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        if (auth()->user()?->loadMissing('role')->hasRole('super_admin')) {
            return redirect()->route('superadmin.dashboard');
        }

        return inertia('dashboard');
    })->name('dashboard');

    Route::middleware('role:super_admin')
        ->prefix('superadmin')
        ->name('superadmin.')
        ->group(function () {
            Route::get('dashboard', [SuperAdminDashboardController::class, 'index'])
                ->name('dashboard');

            Route::resource('deans', SuperAdminDeanController::class)
                ->except(['show', 'create', 'edit']);

            Route::resource('courses', SuperAdminCourseController::class)
                ->except(['show', 'create', 'edit']);
        });
});

require __DIR__.'/settings.php';
