<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\InternAbsenceController;
use App\Http\Controllers\Api\InternDocumentController;
use App\Http\Controllers\Api\InternDocumentRequirementController;
use App\Http\Controllers\Api\InternFaceController;
use App\Http\Controllers\Api\InternPasswordController;
use App\Http\Controllers\Api\InternProfileController;
use App\Http\Controllers\Api\InternProgressController;
use App\Http\Controllers\Api\InternTimeController;
use App\Http\Controllers\Api\InternTimeTaskPhotoController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function (): void {
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:api')->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

Route::middleware('auth:api')->prefix('intern')->group(function (): void {
    Route::get('/progress', [InternProgressController::class, 'show']);
    Route::put('/schedule', [InternProgressController::class, 'updateSchedule']);
    Route::get('/profile', [InternProfileController::class, 'show']);
    Route::put('/password', [InternPasswordController::class, 'update']);
    Route::get('/documents', [InternDocumentController::class, 'index']);
    Route::post('/documents', [InternDocumentController::class, 'store']);
    Route::get('/document-requirements', [InternDocumentRequirementController::class, 'index']);
    Route::post('/document-requirements/seen', [InternDocumentRequirementController::class, 'markSeen']);
    Route::get('/time/status', [InternTimeController::class, 'status']);
    Route::get('/time/logs', [InternTimeController::class, 'logs']);
    Route::post('/time/punch', [InternTimeController::class, 'punch']);
    Route::post('/time/logs/{timeLog}/task-photos', [InternTimeTaskPhotoController::class, 'store']);
    Route::get('/time/logs/{timeLog}/task-photos/{taskPhoto}', [InternTimeTaskPhotoController::class, 'show']);
    Route::delete('/time/logs/{timeLog}/task-photos/{taskPhoto}', [InternTimeTaskPhotoController::class, 'destroy']);
    Route::get('/absences', [InternAbsenceController::class, 'index']);
    Route::post('/absences/{absence}/justify', [InternAbsenceController::class, 'justify']);
    Route::get('/absences/{absence}/proof', [InternAbsenceController::class, 'showProof']);
    Route::post('/face/enroll', [InternFaceController::class, 'enroll']);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:api');
