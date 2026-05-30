<?php

use App\Http\Controllers\Dean\CompanyController as DeanCompanyController;
use App\Http\Controllers\Dean\DashboardController as DeanDashboardController;
use App\Http\Controllers\Dean\SchoolYearController as DeanSchoolYearController;
use App\Http\Controllers\Dean\SectionController as DeanSectionController;
use App\Http\Controllers\Dean\StudentController as DeanStudentController;
use App\Http\Controllers\Dean\SupervisorController as DeanSupervisorController;
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
        if (auth()->user()?->loadMissing('role')->hasRole('dean')) {
            return redirect()->route('deans.dashboard');
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

    Route::middleware('dean')
        ->prefix('deans')
        ->name('deans.')
        ->group(function () {
            Route::get('dashboard', [DeanDashboardController::class, 'index'])
                ->name('dashboard');

            Route::resource('school-years', DeanSchoolYearController::class)
                ->except(['show', 'create', 'edit']);

            Route::patch('school-years/{school_year}/activate', [DeanSchoolYearController::class, 'activate'])
                ->name('school-years.activate');

            Route::post('students/bulk', [DeanStudentController::class, 'bulkStore'])
                ->name('students.bulk-store');
            Route::post('students/mail-credentials', [DeanStudentController::class, 'mailAllCredentials'])
                ->name('students.mail-all-credentials');
            Route::post('students/{student}/mail-credentials', [DeanStudentController::class, 'mailCredentials'])
                ->name('students.mail-credentials');
            Route::resource('students', DeanStudentController::class)
                ->except(['show', 'create', 'edit']);
            Route::get('companies', [DeanCompanyController::class, 'index'])->name('companies.index');
            Route::resource('sections', DeanSectionController::class)
                ->except(['show', 'create', 'edit']);
            Route::get('supervisors', [DeanSupervisorController::class, 'index'])->name('supervisors.index');
        });
});

require __DIR__.'/settings.php';
