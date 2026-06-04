<?php

use App\Http\Controllers\Coordinator\CompanyController as CoordinatorCompanyController;
use App\Http\Controllers\Coordinator\DashboardController as CoordinatorDashboardController;
use App\Http\Controllers\Coordinator\EvaluationAlertController as CoordinatorEvaluationAlertController;
use App\Http\Controllers\Coordinator\DocumentRequirementController as CoordinatorDocumentRequirementController;
use App\Http\Controllers\Coordinator\EvaluationTemplateController as CoordinatorEvaluationTemplateController;
use App\Http\Controllers\Coordinator\OjtEvaluationController as CoordinatorOjtEvaluationController;
use App\Http\Controllers\Coordinator\StudentController as CoordinatorStudentController;
use App\Http\Controllers\Coordinator\SupervisorController as CoordinatorSupervisorController;
use App\Http\Controllers\Dean\CoordinatorController as DeanCoordinatorController;
use App\Http\Controllers\Dean\DashboardController as DeanDashboardController;
use App\Http\Controllers\Dean\SchoolYearController as DeanSchoolYearController;
use App\Http\Controllers\Dean\SectionController as DeanSectionController;
use App\Http\Controllers\Dean\StudentController as DeanStudentController;
use App\Http\Controllers\SuperAdmin\CourseController as SuperAdminCourseController;
use App\Http\Controllers\SuperAdmin\DashboardController as SuperAdminDashboardController;
use App\Http\Controllers\SuperAdmin\DeanController as SuperAdminDeanController;
use App\Http\Controllers\Supervisor\EvaluationAlertController as SupervisorEvaluationAlertController;
use App\Http\Controllers\Supervisor\DashboardController as SupervisorDashboardController;
use App\Http\Controllers\Supervisor\OjtEvaluationController as SupervisorOjtEvaluationController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return redirect()->route('login');
})->name('home');

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
        if (auth()->user()?->loadMissing('role')->hasRole('supervisor')) {
            return redirect()->route('supervisors.dashboard');
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
            Route::resource('sections', DeanSectionController::class)
                ->except(['show', 'create', 'edit']);
            Route::resource('coordinators', DeanCoordinatorController::class)
                ->except(['show', 'create', 'edit']);
            Route::post('coordinators/{coordinator}/mail-credentials', [DeanCoordinatorController::class, 'mailCredentials'])
                ->name('coordinators.mail-credentials');
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

            Route::post('students/{student}/evaluations', [CoordinatorOjtEvaluationController::class, 'store'])
                ->name('students.evaluations.store');
            Route::post('students/evaluations/bulk', [CoordinatorOjtEvaluationController::class, 'storeAll'])
                ->name('students.evaluations.store-all');

            Route::post('evaluation-alerts/completed/seen', [CoordinatorEvaluationAlertController::class, 'markCompletedSeen'])
                ->name('evaluation-alerts.completed.seen');

            Route::resource('evaluation-templates', CoordinatorEvaluationTemplateController::class)
                ->only(['index', 'create', 'store', 'edit', 'update', 'destroy']);

            Route::resource('document-requirements', CoordinatorDocumentRequirementController::class)
                ->only(['index', 'store', 'update', 'destroy']);

            Route::get('companies/deactivated', [CoordinatorCompanyController::class, 'deactivated'])
                ->name('companies.deactivated');
            Route::patch('companies/{company}/reactivate', [CoordinatorCompanyController::class, 'reactivate'])
                ->name('companies.reactivate');
            Route::resource('companies', CoordinatorCompanyController::class)
                ->except(['show', 'create', 'edit']);
            Route::post('companies/{company}/departments', [CoordinatorCompanyController::class, 'storeDepartment'])
                ->name('companies.departments.store');
            Route::patch('companies/{company}/departments/{department}', [CoordinatorCompanyController::class, 'updateDepartment'])
                ->name('companies.departments.update');
            Route::delete('companies/{company}/departments/{department}', [CoordinatorCompanyController::class, 'destroyDepartment'])
                ->name('companies.departments.destroy');

            Route::resource('supervisors', CoordinatorSupervisorController::class)
                ->except(['show', 'create', 'edit']);
            Route::post('supervisors/{supervisor}/mail-credentials', [CoordinatorSupervisorController::class, 'mailCredentials'])
                ->name('supervisors.mail-credentials');
        });

    Route::middleware('supervisor')
        ->prefix('supervisors')
        ->name('supervisors.')
        ->group(function () {
            Route::get('dashboard', [SupervisorDashboardController::class, 'index'])
                ->name('dashboard');

            Route::post('evaluation-alerts/pending/seen', [SupervisorEvaluationAlertController::class, 'markPendingSeen'])
                ->name('evaluation-alerts.pending.seen');

            Route::get('evaluations/{evaluation}', [SupervisorOjtEvaluationController::class, 'show'])
                ->name('evaluations.show');
            Route::patch('evaluations/{evaluation}', [SupervisorOjtEvaluationController::class, 'update'])
                ->name('evaluations.update');
        });
});

require __DIR__.'/settings.php';
