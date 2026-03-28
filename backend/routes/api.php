<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\EmployeeProfileController;
use App\Http\Controllers\Api\YearlySalaryController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::put('/account', [AuthController::class, 'updateAccount']);
        Route::put('/password', [AuthController::class, 'changePassword']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/analytics/dashboard', [AnalyticsController::class, 'dashboard']);

    Route::apiResource('employee-profiles', EmployeeProfileController::class);
    Route::post('/employee-profiles/{employeeProfile}/archive', [EmployeeProfileController::class, 'archive']);

    Route::get('/employee-profiles/{employeeProfile}/attendance', [AttendanceController::class, 'index']);
    Route::post('/employee-profiles/{employeeProfile}/attendance', [AttendanceController::class, 'upsert']);
    Route::post('/employee-profiles/{employeeProfile}/attendance/present-range', [AttendanceController::class, 'markPresentRange']);
    Route::delete('/employee-profiles/{employeeProfile}/attendance/{attendanceRecord}', [AttendanceController::class, 'destroy']);

    Route::get('/employee-profiles/{employeeProfile}/yearly-salary', [YearlySalaryController::class, 'index']);
    Route::post('/employee-profiles/{employeeProfile}/yearly-salary', [YearlySalaryController::class, 'upsert']);
    Route::delete('/employee-profiles/{employeeProfile}/yearly-salary/{yearlySalaryRecord}', [YearlySalaryController::class, 'destroy']);
});

