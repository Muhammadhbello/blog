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
use App\Http\Controllers\Api\RevenuePointController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\DefaulterController;
use App\Http\Controllers\Api\ConsultantController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\PlatformUserController;
use App\Http\Controllers\Api\PlatformSettingController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\TenantUserController;
use App\Http\Controllers\Api\CollectorAssignmentController;
use App\Http\Controllers\Api\TenantSettingController;
use App\Http\Controllers\Api\ClosingController;
use App\Http\Controllers\Api\OfflineSyncController;
use App\Http\Controllers\Api\BulkInvoiceController;
use App\Http\Controllers\Api\ReportsController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PrintController;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::post('/webhooks/payment', [WebhookController::class, 'handlePaymentWebhook']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/analytics/advanced', [AnalyticsController::class, 'getAdvancedStats']);

    // ==========================================
    // PLATFORM ADMIN ROUTES (Super Admin Only)
    // ==========================================
    Route::middleware(['role:super_admin'])->prefix('platform')->group(function () {
        // Tenant Management
        Route::apiResource('tenants', TenantController::class);
        Route::get('/tenants-stats', [TenantController::class, 'stats']);
        Route::post('/tenants/{tenant}/suspend', [TenantController::class, 'suspend']);
        Route::post('/tenants/{tenant}/activate', [TenantController::class, 'activate']);
        Route::put('/tenants/{tenant}/revenue-share', [TenantController::class, 'updateRevenueShare']);

        // Platform User Management
        Route::apiResource('users', PlatformUserController::class);
        Route::get('/users-stats', [PlatformUserController::class, 'stats']);

        // Platform Settings
        Route::get('/settings', [PlatformSettingController::class, 'index']);
        Route::post('/settings', [PlatformSettingController::class, 'store']);
        Route::put('/settings/{platformSetting}', [PlatformSettingController::class, 'update']);
        Route::delete('/settings/{platformSetting}', [PlatformSettingController::class, 'destroy']);
        Route::post('/settings/bulk', [PlatformSettingController::class, 'bulkUpdate']);
        Route::post('/settings/init-defaults', [PlatformSettingController::class, 'initDefaults']);

        // Platform Audit Logs
        Route::get('/audit-logs', [AuditLogController::class, 'index']);
        Route::get('/audit-logs/stats', [AuditLogController::class, 'stats']);
        Route::get('/audit-logs/modules', [AuditLogController::class, 'modules']);
        Route::get('/audit-logs/actions', [AuditLogController::class, 'actions']);

        // System Role Management
        Route::post('/roles/init-system', [RoleController::class, 'initSystemRoles']);

        // Impersonate Tenant (Enter Tenant Portal)
        Route::post('/tenants/{tenant}/impersonate', [TenantController::class, 'impersonate']);
    });

    // Legacy tenant routes (backward compatibility)
    Route::middleware(['role:super_admin'])->group(function () {
        Route::apiResource('tenants', TenantController::class);
    });

    // ==========================================
    // TENANT ADMIN ROUTES (Chairman, Treasurer, HOD)
    // ==========================================
    Route::middleware(['role:chairman,treasurer,hod,consultant,collector'])->group(function () {
        // Core Resources
        Route::apiResource('wards', WardController::class);
        Route::apiResource('departments', DepartmentController::class);
        Route::apiResource('revenue-categories', RevenueCategoryController::class);
        Route::apiResource('revenue-items', RevenueItemController::class);
        Route::apiResource('revenue-points', RevenuePointController::class);
        Route::get('/revenue-points-stats', [RevenuePointController::class, 'stats']);
        Route::apiResource('businesses', BusinessController::class);
        Route::apiResource('invoices', InvoiceController::class);

        // Ticketing
        Route::post('/tickets/batch', [TicketController::class, 'createBatch']);
        Route::get('/tickets/batches', [TicketController::class, 'getBatches']);
        Route::get('/tickets', [TicketController::class, 'getTickets']);
        Route::post('/tickets/sell', [TicketController::class, 'sellTicket']);
        Route::post('/tickets/verify', [TicketController::class, 'verifyTicket']);

        // Closings
        Route::get('/closings', [ClosingController::class, 'index']);
        Route::post('/closings', [ClosingController::class, 'store']);
        Route::get('/closings/pending', [ClosingController::class, 'pending']);
        Route::get('/closings/flagged', [ClosingController::class, 'flagged']);
        Route::get('/closings/stats', [ClosingController::class, 'stats']);
        Route::get('/closings/calculate-expected', [ClosingController::class, 'calculateExpected']);
        Route::get('/closings/{id}', [ClosingController::class, 'show']);
        Route::post('/closings/{id}/approve', [ClosingController::class, 'approve']);
        Route::post('/closings/{id}/reject', [ClosingController::class, 'reject']);

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

        // Tenant Audit Logs
        Route::get('/audit-logs', [AuditLogController::class, 'index']);
        Route::get('/audit-logs/stats', [AuditLogController::class, 'stats']);
    });

    // ==========================================
    // TENANT USER MANAGEMENT (Chairman Only)
    // ==========================================
    Route::middleware(['role:chairman'])->prefix('tenant')->group(function () {
        // User Management
        Route::apiResource('users', TenantUserController::class);
        Route::get('/users-stats', [TenantUserController::class, 'stats']);
        Route::post('/users/{user}/assign-roles', [TenantUserController::class, 'assignRoles']);

        // Role Management
        Route::apiResource('roles', RoleController::class);
        Route::get('/permissions', [RoleController::class, 'permissions']);
        Route::post('/roles/{role}/assign-users', [RoleController::class, 'assignUsers']);

        // Collector Assignments
        Route::apiResource('collector-assignments', CollectorAssignmentController::class);
        Route::get('/collectors', [CollectorAssignmentController::class, 'getCollectors']);
        Route::get('/collector-assignments-stats', [CollectorAssignmentController::class, 'stats']);

        // Tenant Settings (Payment, SMS, Templates)
        Route::get('/settings/payment', [TenantSettingController::class, 'getPaymentSettings']);
        Route::post('/settings/payment', [TenantSettingController::class, 'savePaymentSettings']);
        Route::get('/settings/sms', [TenantSettingController::class, 'getSmsSettings']);
        Route::post('/settings/sms', [TenantSettingController::class, 'saveSmsSettings']);
        Route::get('/templates', [TenantSettingController::class, 'getTemplates']);
        Route::put('/templates/{id}', [TenantSettingController::class, 'updateTemplate']);
        Route::get('/settings/general', [TenantSettingController::class, 'getGeneralSettings']);
        Route::post('/settings/general', [TenantSettingController::class, 'updateGeneralSettings']);
    });

    // ==========================================
    // BULK INVOICE ROUTES
    // ==========================================
    Route::middleware(['role:chairman,treasurer,hod'])->prefix('bulk-invoices')->group(function () {
        Route::get('/businesses', [BulkInvoiceController::class, 'getBusinessesForBulk']);
        Route::post('/preview', [BulkInvoiceController::class, 'previewBulk']);
        Route::post('/generate', [BulkInvoiceController::class, 'generateBulk']);
        Route::get('/history', [BulkInvoiceController::class, 'getBulkHistory']);
    });

    // ==========================================
    // REPORTS & ANALYTICS ROUTES
    // ==========================================
    Route::middleware(['role:chairman,treasurer,hod,auditor'])->prefix('reports')->group(function () {
        Route::get('/dashboard-analytics', [ReportsController::class, 'getDashboardAnalytics']);
        Route::get('/invoices', [ReportsController::class, 'getInvoiceReport']);
        Route::get('/tickets', [ReportsController::class, 'getTicketReport']);
        Route::get('/closings', [ReportsController::class, 'getClosingReport']);
        Route::get('/defaulters', [ReportsController::class, 'getDefaulterReport']);
        Route::get('/export', [ReportsController::class, 'exportReport']);
    });

    // ==========================================
    // OFFLINE SYNC ROUTES
    // ==========================================
    Route::middleware(['role:collector,consultant'])->prefix('offline')->group(function () {
        Route::post('/sync-tickets', [OfflineSyncController::class, 'syncTickets']);
        Route::get('/tickets', [OfflineSyncController::class, 'getOfflineTickets']);
        Route::get('/sync-history', [OfflineSyncController::class, 'getSyncHistory']);
        Route::post('/register-device', [OfflineSyncController::class, 'registerDevice']);
    });

    // ==========================================
    // COLLECTOR SPECIFIC ROUTES
    // ==========================================
    Route::middleware(['role:collector'])->prefix('collector')->group(function () {
        Route::get('/my-assignments', [CollectorAssignmentController::class, 'getMyAssignments']);
        Route::get('/my-closings', [ClosingController::class, 'myClosings']);
        Route::get('/my-performance', [ClosingController::class, 'myPerformance']);
    });

    // ==========================================
    // CONSULTANT PORTAL ROUTES
    // ==========================================
    Route::middleware(['role:consultant_admin,consultant'])->prefix('consultant')->group(function () {
        Route::get('/dashboard', [ConsultantController::class, 'getDashboard']);
        Route::get('/my-assignments', [ConsultantController::class, 'getMyAssignments']);
        Route::get('/my-tickets', [TicketController::class, 'getMyTickets']);
        Route::get('/my-closings', [ClosingController::class, 'myClosings']);
        Route::get('/my-performance', [ClosingController::class, 'myPerformance']);
    });

    // ==========================================
    // BUSINESS PORTAL ROUTES
    // ==========================================
    Route::middleware(['role:business_user'])->prefix('business')->group(function () {
        Route::get('/dashboard', [BusinessController::class, 'portalDashboard']);
        Route::get('/invoices', [InvoiceController::class, 'businessInvoices']);
        Route::get('/profile', [BusinessController::class, 'portalProfile']);
    });
});
