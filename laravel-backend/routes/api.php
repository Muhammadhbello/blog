<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TenantController;
use App\Http\Controllers\Api\BusinessController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\WebhookController;
use App\Http\Controllers\Api\WardController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\RevenueCategoryController;
use App\Http\Controllers\Api\RevenueItemController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\DefaulterController;
use App\Http\Controllers\Api\ConsultantController;
use App\Http\Controllers\Api\AnalyticsController;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::post('/webhooks/payment', [WebhookController::class, 'handlePaymentWebhook']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/analytics/advanced', [AnalyticsController::class, 'getAdvancedStats']);

    Route::middleware(['role:super_admin'])->group(function () {
        Route::apiResource('tenants', TenantController::class);
    });

    Route::middleware(['role:chairman,treasurer,hod,consultant,collector'])->group(function () {
        Route::apiResource('wards', WardController::class);
        Route::apiResource('departments', DepartmentController::class);
        Route::apiResource('revenue-categories', RevenueCategoryController::class);
        Route::apiResource('revenue-items', RevenueItemController::class);
        Route::apiResource('businesses', BusinessController::class);
        Route::apiResource('invoices', InvoiceController::class);

        // Ticketing
        Route::post('/tickets/batch', [TicketController::class, 'createBatch']);
        Route::get('/tickets/batches', [TicketController::class, 'getBatches']);
        Route::get('/tickets', [TicketController::class, 'getTickets']);
        Route::post('/tickets/sell', [TicketController::class, 'sellTicket']);
        Route::post('/tickets/verify', [TicketController::class, 'verifyTicket']);

        // Defaulters
        Route::post('/defaulters/detect', [DefaulterController::class, 'detectDefaulters']);
        Route::get('/defaulters', [DefaulterController::class, 'getDefaulters']);
        Route::post('/defaulters/{defaulter}/remind', [DefaulterController::class, 'sendReminder']);
        Route::post('/defaulters/bulk-remind', [DefaulterController::class, 'sendBulkReminders']);

        // Consultants
        Route::post('/consultants/assign', [ConsultantController::class, 'assignConsultant']);
        Route::get('/consultants/assignments', [ConsultantController::class, 'getAssignments']);
        Route::get('/consultants', [ConsultantController::class, 'getConsultants']);
        Route::get('/consultants/scoped-data', [ConsultantController::class, 'getScopedData']);
    });
});
