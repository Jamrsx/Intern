<?php

use App\Http\Controllers\Coordinator\DashboardController as CoordinatorDashboardController;
use App\Http\Controllers\Coordinator\StudentController as CoordinatorStudentController;
use App\Http\Controllers\Dean\CompanyController as DeanCompanyController;
use App\Http\Controllers\Dean\CoordinatorController as DeanCoordinatorController;
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
        if (auth()->user()?->loadMissing('role')->hasRole('coordinator')) {
            return redirect()->route('coordinators.dashboard');
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
            Route::get('companies/deactivated', [DeanCompanyController::class, 'deactivated'])
                ->name('companies.deactivated');
            Route::patch('companies/{company}/reactivate', [DeanCompanyController::class, 'reactivate'])
                ->name('companies.reactivate');
            Route::resource('companies', DeanCompanyController::class)
                ->except(['show', 'create', 'edit']);
            Route::post('companies/{company}/departments', [DeanCompanyController::class, 'storeDepartment'])
                ->name('companies.departments.store');
            Route::patch('companies/{company}/departments/{department}', [DeanCompanyController::class, 'updateDepartment'])
                ->name('companies.departments.update');
            Route::delete('companies/{company}/departments/{department}', [DeanCompanyController::class, 'destroyDepartment'])
                ->name('companies.departments.destroy');
            Route::resource('sections', DeanSectionController::class)
                ->except(['show', 'create', 'edit']);
            Route::resource('coordinators', DeanCoordinatorController::class)
                ->except(['show', 'create', 'edit']);
            Route::post('coordinators/{coordinator}/mail-credentials', [DeanCoordinatorController::class, 'mailCredentials'])
                ->name('coordinators.mail-credentials');
            Route::resource('supervisors', DeanSupervisorController::class)
                ->except(['show', 'create', 'edit']);
            Route::post('supervisors/{supervisor}/mail-credentials', [DeanSupervisorController::class, 'mailCredentials'])
                ->name('supervisors.mail-credentials');
        });

    Route::middleware('coordinator')
        ->prefix('coordinators')
        ->name('coordinators.')
        ->group(function () {
            Route::get('dashboard', [CoordinatorDashboardController::class, 'index'])
                ->name('dashboard');

            Route::resource('students', CoordinatorStudentController::class)
                ->only(['index', 'show', 'update']);

            Route::get('students/{student}/documents/{document}', [CoordinatorStudentController::class, 'showDocument'])
                ->name('students.documents.show');
        });
});

require __DIR__.'/settings.php';
