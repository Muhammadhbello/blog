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
use App\Http\Controllers\Api\ConsultantWalletController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\CustomDomainController;
use App\Http\Controllers\Api\PlatformAnalyticsController;
use App\Http\Controllers\Api\TenantAuditLogController;

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
        Route::post('/impersonate/exit', [TenantController::class, 'exitImpersonation']);

        // ==========================================
        // PLATFORM ANALYTICS
        // ==========================================
        Route::prefix('analytics')->group(function () {
            Route::get('/dashboard', [PlatformAnalyticsController::class, 'getDashboardStats']);
            Route::get('/revenue-trends', [PlatformAnalyticsController::class, 'getRevenueTrends']);
            Route::get('/tenant-comparison', [PlatformAnalyticsController::class, 'getTenantComparison']);
            Route::get('/transaction-volume', [PlatformAnalyticsController::class, 'getTransactionVolume']);
            Route::get('/health', [PlatformAnalyticsController::class, 'getPlatformHealth']);
        });

        // ==========================================
        // BACKUP & RESTORE MANAGEMENT
        // ==========================================
        Route::prefix('backups')->group(function () {
            Route::get('/stats', [BackupController::class, 'getStats']);
            Route::get('/', [BackupController::class, 'index']);
            Route::post('/platform', [BackupController::class, 'backupPlatform']);
            Route::post('/tenant/{slug}', [BackupController::class, 'backupTenant']);
            Route::get('/tenant/{slug}', [BackupController::class, 'getTenantBackups']);
            Route::get('/tenant/{slug}/available', [BackupController::class, 'getAvailableRestores']);
            Route::get('/download/{backupId}', [BackupController::class, 'downloadBackup']);
            Route::delete('/{backupId}', [BackupController::class, 'deleteBackup']);
            Route::post('/cleanup', [BackupController::class, 'runCleanup']);
        });

        Route::prefix('restore')->group(function () {
            Route::get('/history', [BackupController::class, 'getRestoreHistory']);
            Route::post('/tenant/{slug}', [BackupController::class, 'initiateRestore']);
            Route::post('/confirm/{restoreId}', [BackupController::class, 'confirmRestore']);
            Route::get('/progress/{restoreId}', [BackupController::class, 'getRestoreProgress']);
        });

        // ==========================================
        // CUSTOM DOMAIN MANAGEMENT
        // ==========================================
        Route::prefix('domains')->group(function () {
            Route::get('/', [CustomDomainController::class, 'getAllCustomDomains']);
            Route::get('/tenant/{slug}', [CustomDomainController::class, 'getStatus']);
            Route::post('/tenant/{slug}', [CustomDomainController::class, 'setDomain']);
            Route::post('/tenant/{slug}/verify', [CustomDomainController::class, 'verifyDomain']);
            Route::delete('/tenant/{slug}', [CustomDomainController::class, 'removeDomain']);
            Route::post('/tenant/{slug}/ssl', [CustomDomainController::class, 'enableSsl']);
            Route::post('/check-ssl', [CustomDomainController::class, 'checkSslCertificates']);
        });

        // ==========================================
        // PAYOUTS MANAGEMENT
        // ==========================================
        Route::prefix('payouts')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\PayoutController::class, 'index']);
            Route::get('/stats', [\App\Http\Controllers\Api\PayoutController::class, 'stats']);
            Route::get('/{payoutId}', [\App\Http\Controllers\Api\PayoutController::class, 'show']);
            Route::post('/generate', [\App\Http\Controllers\Api\PayoutController::class, 'generate']);
            Route::post('/{payoutId}/process', [\App\Http\Controllers\Api\PayoutController::class, 'process']);
            Route::post('/bulk-process', [\App\Http\Controllers\Api\PayoutController::class, 'processBulk']);
        });

        // ==========================================
        // RECONCILIATION MANAGEMENT
        // ==========================================
        Route::prefix('reconciliation')->group(function () {
            Route::get('/stats', [\App\Http\Controllers\Api\ReconciliationController::class, 'stats']);
            Route::get('/transactions', [\App\Http\Controllers\Api\ReconciliationController::class, 'transactions']);
            Route::get('/transactions/{transactionId}', [\App\Http\Controllers\Api\ReconciliationController::class, 'show']);
            Route::get('/periods', [\App\Http\Controllers\Api\ReconciliationController::class, 'periods']);
            Route::post('/run', [\App\Http\Controllers\Api\ReconciliationController::class, 'run']);
            Route::post('/transactions/{transactionId}/resolve', [\App\Http\Controllers\Api\ReconciliationController::class, 'resolve']);
            Route::get('/export', [\App\Http\Controllers\Api\ReconciliationController::class, 'export']);
        });
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
        Route::get('/defaulters/stats', [DefaulterController::class, 'getStats']);
        Route::get('/defaulters/templates', [DefaulterController::class, 'getTemplates']);
        Route::post('/defaulters/preview-message', [DefaulterController::class, 'previewMessage']);
        Route::post('/defaulters/{defaulter}/remind', [DefaulterController::class, 'sendReminder']);
        Route::post('/defaulters/bulk-remind', [DefaulterController::class, 'sendBulkReminders']);
        Route::post('/defaulters/bulk-filtered', [DefaulterController::class, 'sendBulkToFiltered']);
        Route::put('/defaulters/{id}/status', [DefaulterController::class, 'updateStatus']);

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
    Route::middleware(['role:chairman,lga_admin'])->prefix('tenant')->group(function () {
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

        // Tenant Settings - Payment Gateway
        Route::get('/settings/payment', [TenantSettingController::class, 'getPaymentSettings']);
        Route::post('/settings/payment', [TenantSettingController::class, 'savePaymentSettings']);
        Route::post('/settings/payment/test', [TenantSettingController::class, 'testPaymentConnection']);
        
        // Tenant Settings - SMS Gateway
        Route::get('/settings/sms', [TenantSettingController::class, 'getSmsSettings']);
        Route::post('/settings/sms', [TenantSettingController::class, 'saveSmsSettings']);
        Route::post('/settings/sms/test', [TenantSettingController::class, 'testSmsConnection']);
        
        // Message Templates
        Route::get('/templates', [TenantSettingController::class, 'getTemplates']);
        Route::put('/templates/{id}', [TenantSettingController::class, 'updateTemplate']);
        Route::post('/templates/preview', [TenantSettingController::class, 'previewTemplate']);
        
        // General Settings
        Route::get('/settings/general', [TenantSettingController::class, 'getGeneralSettings']);
        Route::post('/settings/general', [TenantSettingController::class, 'updateGeneralSettings']);

        // Tenant Audit Logs
        Route::get('/audit-logs', [TenantAuditLogController::class, 'index']);
        Route::get('/audit-logs/stats', [TenantAuditLogController::class, 'stats']);
        Route::get('/audit-logs/modules', [TenantAuditLogController::class, 'modules']);
        Route::get('/audit-logs/actions', [TenantAuditLogController::class, 'actions']);
        Route::get('/audit-logs/entity/{entityType}/{entityId}', [TenantAuditLogController::class, 'entityHistory']);
        Route::get('/audit-logs/export', [TenantAuditLogController::class, 'export']);
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

    // ==========================================
    // EMAIL NOTIFICATION ROUTES
    // ==========================================
    Route::middleware(['role:chairman,treasurer'])->prefix('notifications')->group(function () {
        Route::get('/email/settings', [NotificationController::class, 'getEmailSettings']);
        Route::post('/email/settings', [NotificationController::class, 'saveEmailSettings']);
        Route::post('/email/test', [NotificationController::class, 'testEmail']);
        Route::get('/email/templates', [NotificationController::class, 'getTemplates']);
        Route::put('/email/templates/{id}', [NotificationController::class, 'updateTemplate']);
        Route::get('/email/logs', [NotificationController::class, 'getLogs']);
        Route::get('/email/stats', [NotificationController::class, 'getStats']);
        Route::post('/email/bulk', [NotificationController::class, 'sendBulkEmail']);
        Route::post('/email/resend/{id}', [NotificationController::class, 'resendEmail']);
    });

    // ==========================================
    // REAL-TIME NOTIFICATIONS (POLLING FALLBACK)
    // ==========================================
    Route::prefix('realtime')->group(function () {
        Route::get('/poll', [NotificationController::class, 'poll']);
        Route::post('/subscribe', [NotificationController::class, 'subscribe']);
        Route::get('/backup/{backupId}/progress', [NotificationController::class, 'getBackupProgress']);
        Route::get('/restore/{restoreId}/progress', [NotificationController::class, 'getRestoreProgress']);
        Route::get('/sms/{batchId}/progress', [NotificationController::class, 'getSmsProgress']);
        Route::post('/pusher/auth', [NotificationController::class, 'pusherAuth']);
        Route::get('/pusher/config', [NotificationController::class, 'getPusherConfig']);
    });

    // ==========================================
    // PRINT / RECEIPT ROUTES
    // ==========================================
    Route::middleware(['role:chairman,treasurer,hod,collector,consultant'])->prefix('print')->group(function () {
        Route::get('/ticket/{id}', [PrintController::class, 'getTicketPrintData']);
        Route::get('/batch/{batchId}/tickets', [PrintController::class, 'getBatchTicketsPrintData']);
        Route::get('/payment/{paymentId}/receipt', [PrintController::class, 'getPaymentReceiptData']);
        Route::get('/invoice/{invoiceId}', [PrintController::class, 'getInvoicePrintData']);
        Route::get('/closing/{closingId}/receipt', [PrintController::class, 'getClosingReceiptData']);
        Route::post('/settings', [PrintController::class, 'updatePrintSettings']);
    });

    // ==========================================
    // CONSULTANT WALLET ROUTES
    // ==========================================
    Route::middleware(['role:consultant,consultant_admin'])->prefix('wallet')->group(function () {
        Route::get('/my', [ConsultantWalletController::class, 'getMyWallet']);
        Route::get('/transactions', [ConsultantWalletController::class, 'getTransactions']);
        Route::post('/withdraw', [ConsultantWalletController::class, 'requestWithdrawal']);
    });

    // Admin wallet management
    Route::middleware(['role:chairman,treasurer'])->prefix('wallet-admin')->group(function () {
        Route::get('/stats', [ConsultantWalletController::class, 'getWalletStats']);
        Route::get('/withdrawals', [ConsultantWalletController::class, 'getWithdrawalRequests']);
        Route::post('/withdrawals/{id}/approve', [ConsultantWalletController::class, 'approveWithdrawal']);
        Route::post('/withdrawals/{id}/reject', [ConsultantWalletController::class, 'rejectWithdrawal']);
        Route::get('/commission-rules', [ConsultantWalletController::class, 'getCommissionRules']);
        Route::post('/commission-rules', [ConsultantWalletController::class, 'saveCommissionRule']);
        Route::delete('/commission-rules/{id}', [ConsultantWalletController::class, 'deleteCommissionRule']);
    });
});
