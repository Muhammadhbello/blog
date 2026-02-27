# FlexCloud - Multi-Tenant Revenue Management SaaS

## Overview
FlexCloud is an **enterprise-grade** multi-tenant SaaS platform for Local Government Revenue Intelligence, built with Laravel 11 (PHP 8.3) backend and Next.js 14 (React 18, TypeScript) frontend.

## Architecture

### Multi-Database Tenancy
- **Platform Database**: `flexcloud_platform` - Central SaaS control, revenue share rules, audit logs
- **Tenant Databases**: `{slug}_tenant` - Each LGA has physically isolated database
- **Subdomain Resolution**: `{tenant}.flexcloud.ng` routes to tenant database
- **Custom Domains**: Support for `revenue.{tenant}.gov.ng` with DNS verification

### Tech Stack
- **Backend**: Laravel 11, PHP 8.3
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Database**: MySQL 8.0 (multi-database, physical isolation)
- **Authentication**: Laravel Sanctum (scoped per database)
- **UI Framework**: Shadcn/UI + Custom Enterprise Components

### Enterprise Features
- [x] **Subdomain-based Tenancy**: `{tenant}.flexcloud.ng` → automatic DB switching
- [x] **Custom Domain Support**: Tenants can use their own branded domains
- [x] **Revenue Share System**: Platform-level revenue split (5% default)
  - Percentage model (default 5%)
  - Tiered model (volume-based discounts)
  - Flat monthly fee model
  - Hybrid model (base + percentage)
  - Category/Item overrides
- [x] **Enterprise UI/UX**:
  - Glassmorphism design (`bg-white/80 backdrop-blur-xl`)
  - Animated number counters
  - Bento grid layouts
  - Sparkline mini-charts
  - Progress rings
  - Skeleton loaders (shimmer effect)
  - View mode toggle (Comfortable/Compact)
- [x] **Enhanced Middleware Stack**:
  - SubdomainResolver → SwitchDB → auth:sanctum → RoleCheck → TenantMaintenance
- [x] **Platform Audit Logging**: Impersonation tracking, tenant creation logs
- [x] **Enterprise Backup & Restore**: Zero-downtime tenant isolation

## Implemented Features

### Platform Admin (Super Admin)
- [x] Platform login page
- [x] Platform dashboard with revenue breakdown
- [x] Tenant management (CRUD)
- [x] Tenant creation with automatic:
  - Database provisioning
  - Migration running
  - Admin user seeding
- [x] Tenant status management (suspend/activate)
- [x] **Enter Tenant Portal** (Impersonation)
- [x] Platform audit logs
- [x] Platform settings management
- [x] Revenue share configuration per tenant
- [x] **Custom Domain Management**
  - Set custom domains per tenant
  - DNS verification (TXT/CNAME)
  - SSL certificate provisioning
- [x] **Backup & Restore System**
  - Platform database backups
  - Individual tenant backups
  - Zero-downtime tenant restore
  - Backup history and cleanup
  - Retention policy management
- [x] **Enterprise Sidebar Navigation**
  - Glassmorphism design with accordion groups
  - Role-based menu filtering
  - Notification badges
  - Real-time backup progress indicators

### UI/UX Enhancements
- [x] **Platform Sidebar** (`/components/sidebar/PlatformSidebar.tsx`)
  - Collapsible accordion groups
  - Active state with gradient background and left accent bar
  - Notification badges (support tickets, onboarding)
  - User profile footer with logout
  - Mobile responsive with overlay
- [x] **Tenant Sidebar** (`/components/sidebar/TenantSidebar.tsx`)
  - Role-based menu visibility
  - Consultant-specific simplified view
  - Quick action button for ticket selling
  - Pending closings/defaulters badges
  - Impersonation banner integration
- [x] **Notification System** (`/contexts/NotificationContext.tsx`)
  - Real-time backup progress polling
  - Toast notifications
  - Notification bell with dropdown
  - Read/unread state management

### Tenant Portal
- [x] Tenant login page with role tabs (Staff/Business/Consultant)
- [x] Enterprise dashboard with Bento Grid layout
- [x] Sidebar navigation (independently scrollable)
- [x] **Impersonation Banner** - Shows when platform admin is viewing tenant

### Tenant Modules
- [x] **Wards** - CRUD management
- [x] **Departments** - CRUD with HOD assignment
- [x] **Revenue Categories** - CRUD management
- [x] **Revenue Items** - CRUD with tariff configuration
- [x] **Revenue Points** - CRUD for collection locations
- [x] **Businesses** - Registration with categories/sizes/hierarchy
- [x] **Business Categories** - Hierarchical categorization
- [x] **Invoices** - CRUD, issue, bulk generation, payments, **PDF printing**
- [x] **Bulk Invoices** - Advanced UI for bulk invoice generation
- [x] **Tickets** - Batch creation, sell, verify, reports
- [x] **Closings** - Daily/weekly revenue reconciliation
- [x] **Consultants** - CRUD with portal access
- [x] **Consultant Wallet** - Commission tracking and withdrawals
- [x] **Collectors** - Assignment management
- [x] **Defaulters** - Detection and SMS reminders (**Bulk SMS Feature**)
- [x] **Analytics** - Advanced statistics
- [x] **Reports** - Comprehensive reports dashboard
- [x] **Offline POS Sync** - Download tickets, offline sales, sync queue
- [x] **Receipt/Ticket Printing** - Thermal printer support (58mm/80mm)

### Settings (Per-Tenant)
- [x] **Payment Gateway Settings** (PaymentPoint/PalmPay)
- [x] **SMS Gateway Settings** (Termii/Twilio/AfricasTalking)
- [x] **Notification Templates** - SMS templates with placeholders
- [x] **Email Notifications** - SMTP/SendGrid/Mailgun configuration
- [x] **General Settings** - Tenant configuration
- [x] **Print Settings** - Paper size, QR code, logo, footer text

### Portals
- [x] **Business Portal** - Dedicated dashboard for businesses
  - Virtual account display with copy button
  - Invoice history and status
  - Payment history
  - Business profile
- [x] **Consultant Portal** - Dedicated dashboard for consultants
  - Today's collections and stats
  - Commission tracking
  - Assignment management
  - Ticket selling interface
  - Closing submission
  - **Wallet & Withdrawals**

### Roles & Permissions
- [x] Chairman - Full access
- [x] Treasurer - Finance operations
- [x] HOD - Department-scoped access
- [x] Collector - Ticket selling, closings
- [x] Consultant - Portal with scoped data
- [x] Business User - Portal with invoices/payments
- [x] Auditor - Read-only access

## File Structure

```
/app/
├── laravel-backend/
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/
│   │   │   │   ├── AuthController.php
│   │   │   │   ├── TenantController.php
│   │   │   │   ├── BusinessController.php
│   │   │   │   ├── ConsultantController.php
│   │   │   │   ├── ConsultantWalletController.php
│   │   │   │   ├── DefaulterController.php (Bulk SMS)
│   │   │   │   ├── BackupController.php
│   │   │   │   ├── CustomDomainController.php
│   │   │   │   ├── BulkInvoiceController.php
│   │   │   │   ├── ReportsController.php
│   │   │   │   ├── InvoiceController.php
│   │   │   │   ├── TicketController.php
│   │   │   │   ├── ClosingController.php
│   │   │   │   ├── NotificationController.php
│   │   │   │   ├── PrintController.php
│   │   │   │   └── ...
│   │   │   └── Middleware/
│   │   │       ├── SubdomainResolver.php
│   │   │       └── RoleMiddleware.php
│   │   ├── Models/
│   │   │   ├── Defaulter.php
│   │   │   ├── BackupRecord.php
│   │   │   └── ...
│   │   └── Services/
│   │       ├── TenantDatabaseService.php
│   │       ├── SMSService.php (Bulk SMS)
│   │       ├── BackupService.php
│   │       ├── RestoreService.php
│   │       ├── CustomDomainService.php
│   │       ├── InvoiceService.php
│   │       ├── TicketService.php
│   │       ├── ClosingService.php
│   │       ├── PaymentGatewayService.php
│   │       ├── RevenueShareService.php
│   │       └── ConsultantWalletService.php
│   ├── app/Console/Commands/
│   │   └── CreateTenantCommand.php
│   ├── database/migrations/
│   │   ├── platform/
│   │   └── tenant/
│   └── routes/api.php
│
└── nextjs-frontend/
    ├── app/
    │   ├── login/page.tsx
    │   ├── dashboard/
    │   │   ├── page.tsx
    │   │   └── enterprise/page.tsx
    │   ├── platform/
    │   │   ├── dashboard/enterprise/page.tsx
    │   │   ├── tenants/page.tsx
    │   │   ├── backups/page.tsx
    │   │   ├── domains/page.tsx
    │   │   └── audit-logs/page.tsx
    │   ├── business-portal/page.tsx
    │   ├── consultant-portal/
    │   │   ├── page.tsx
    │   │   └── wallet/page.tsx
    │   ├── defaulters/page.tsx (Bulk SMS UI)
    │   ├── businesses/
    │   ├── invoices/
    │   │   ├── page.tsx
    │   │   └── bulk/page.tsx
    │   ├── tickets/
    │   ├── closings/
    │   ├── reports/
    │   ├── offline-sync/
    │   └── settings/
    ├── components/
    │   ├── TenantLayout.tsx
    │   ├── EnhancedTenantLayout.tsx
    │   ├── PlatformLayout.tsx
    │   └── sidebar/
    │       ├── PlatformSidebar.tsx
    │       └── TenantSidebar.tsx
    ├── contexts/
    │   ├── AuthContext.tsx
    │   └── NotificationContext.tsx
    └── hooks/
        └── usePermission.ts
```

## API Endpoints

### Platform Routes (`/api/platform/*`)
- `POST /api/platform/tenants` - Create tenant
- `GET /api/platform/tenants` - List tenants
- `POST /api/platform/tenants/{id}/impersonate` - Enter tenant portal (Full Access)
- `POST /api/platform/impersonate/exit` - Exit impersonation session
- `POST /api/platform/tenants/{id}/suspend` - Suspend tenant
- `POST /api/platform/tenants/{id}/activate` - Activate tenant
- `PUT /api/platform/tenants/{id}/revenue-share` - Update revenue share
- `GET/POST /api/platform/backups/*` - Backup management
- `GET/POST /api/platform/restore/*` - Restore management
- `GET/POST /api/platform/domains/*` - Custom domain management
- `GET /api/platform/analytics/dashboard` - Dashboard stats with metrics
- `GET /api/platform/analytics/revenue-trends` - Revenue trends over time
- `GET /api/platform/analytics/tenant-comparison` - Compare tenant performance
- `GET /api/platform/analytics/transaction-volume` - Transaction volume analytics
- `GET /api/platform/analytics/health` - Platform health metrics

### Auth Routes
- `POST /api/auth/login` - Login (supports login_type: user/business/consultant)

### Tenant Routes
- `GET/POST /api/revenue-points` - Revenue points CRUD
- `GET/POST /api/closings` - Closings management
- `POST /api/closings/{id}/approve` - Approve closing
- `POST /api/closings/{id}/reject` - Reject closing

### Tenant Settings Routes
- `GET /api/tenant/settings/payment` - Get all payment provider settings
- `POST /api/tenant/settings/payment` - Save payment provider settings
- `POST /api/tenant/settings/payment/test` - Test payment connection
- `GET /api/tenant/settings/sms` - Get all SMS provider settings
- `POST /api/tenant/settings/sms` - Save SMS provider settings
- `POST /api/tenant/settings/sms/test` - Test SMS connection
- `GET /api/tenant/templates` - Get message templates
- `PUT /api/tenant/templates/{id}` - Update message template
- `POST /api/tenant/templates/preview` - Preview template with sample data
- `GET/POST /api/tenant/settings/general` - General settings

### Tenant Audit Logs Routes
- `GET /api/tenant/audit-logs` - Get paginated audit logs
- `GET /api/tenant/audit-logs/stats` - Get audit statistics
- `GET /api/tenant/audit-logs/modules` - Get available modules
- `GET /api/tenant/audit-logs/actions` - Get available actions
- `GET /api/tenant/audit-logs/entity/{type}/{id}` - Get entity history
- `GET /api/tenant/audit-logs/export` - Export logs as CSV

### Defaulter Routes (Bulk SMS)
- `POST /api/defaulters/detect` - Detect defaulters
- `GET /api/defaulters` - Get all defaulters
- `GET /api/defaulters/stats` - Get defaulter statistics
- `GET /api/defaulters/templates` - Get SMS templates
- `POST /api/defaulters/preview-message` - Preview personalized message
- `POST /api/defaulters/{id}/remind` - Send single reminder
- `POST /api/defaulters/bulk-remind` - Send bulk SMS reminders
- `POST /api/defaulters/bulk-filtered` - Send SMS to filtered defaulters
- `PUT /api/defaulters/{id}/status` - Update defaulter status

### Consultant Wallet Routes
- `GET /api/wallet/my` - Get wallet summary
- `GET /api/wallet/transactions` - Get transactions
- `POST /api/wallet/withdraw` - Request withdrawal
- `GET /api/wallet-admin/stats` - Get wallet stats (admin)
- `GET /api/wallet-admin/withdrawals` - Get withdrawal requests
- `POST /api/wallet-admin/withdrawals/{id}/approve` - Approve withdrawal
- `POST /api/wallet-admin/withdrawals/{id}/reject` - Reject withdrawal
- `GET /api/wallet-admin/commission-rules` - Get commission rules
- `POST /api/wallet-admin/commission-rules` - Save commission rule

---

## Environment Note
**IMPORTANT:** This project uses Laravel (PHP) backend and Next.js frontend.

The code is located in:
- `/app/laravel-backend/` - Laravel API backend
- `/app/nextjs-frontend/` - Next.js frontend

**This environment requires PHP/MySQL setup to run the Laravel backend.**

To run this application:
1. Set up a LEMP (Linux, Nginx, MySQL, PHP) or LAMP stack
2. Configure MySQL with `flexcloud_platform` database
3. Run `composer install` in `/app/laravel-backend`
4. Run `npm install` in `/app/nextjs-frontend`
5. Configure `.env` files with proper database credentials
6. Run `php artisan migrate --path=database/migrations/platform`
7. Run `npm run dev` for Next.js frontend

---

## Roadmap

### P0 (Critical) - COMPLETED ✅
- [x] Multi-database tenancy core
- [x] Platform admin dashboard
- [x] Tenant modules (Wards, Departments, Revenue Points)
- [x] Invoicing system with PDF
- [x] Ticketing system
- [x] Closings management
- [x] Business Portal
- [x] Consultant Portal
- [x] Payment Gateway Integration (API ready)
- [x] SMS Gateway Integration (API ready)
- [x] Consultant Wallet System
- [x] Bulk SMS for Defaulters

### P1 (High) - COMPLETED ✅
- [x] Offline POS sync queue
- [x] Advanced bulk invoice operations UI
- [x] Receipt/ticket printing for thermal printers
- [x] Enhanced business registration with categories
- [x] Enterprise Backup & Restore System
- [x] Custom Domain Management

### P2 (Medium) - COMPLETED
- [x] Advanced reporting with charts
- [x] Email notifications
- [x] Secure Impersonation Logic (Platform Admin Full Access)
- [x] Full Audit Logging (Tenant-level with Auditable trait)
- [x] Platform Analytics Dashboard
- [x] Tenant Settings UI (Payment & SMS Gateway Configuration)
- [x] WebSocket Notifications (Pusher + Polling fallback)
- [x] Message Templates UI with Live Preview & Mobile Mockup
- [x] Apache/Nginx Wildcard Subdomain Configuration
- [x] Production Deployment Guide with Let's Encrypt SSL
- [x] Platform Payouts Management
- [x] Platform Reconciliation Module

### P3 (Low) - IN PROGRESS
- [ ] Mobile app (React Native)
- [ ] Multi-language support (i18n)
- [x] Payment Integration (API Ready - PaymentPoint, PalmPay)
- [x] SMS Integration (API Ready - Termii, Twilio, Africa's Talking)
- [x] Real-time Pusher Integration with Fallback
- [x] Email Template Editor with HTML Preview
- [x] Comprehensive Documentation Suite (Setup, Deployment, Backup, API Reference)

---

## Changelog

### December 2025 (Current Session - Documentation & Templates)
**Platform Revenue Dashboard (Enhancement):**
- Created `/app/nextjs-frontend/app/platform/revenue-dashboard/page.tsx` with:
  - Interactive Area Chart for daily revenue trends
  - Donut Chart for revenue by category distribution
  - Horizontal Bar Chart for tenant performance comparison
  - Composed Chart for reconciliation status (bars + line)
  - Payout history chart with amount trends
  - Transaction volume line chart
  - Tenant growth analysis table with sparklines
  - Custom tooltips with formatted currency
  - Responsive design for all screen sizes
- Updated Platform Sidebar with Revenue Dashboard link

**Platform Payouts Module:**
- Created `/app/nextjs-frontend/app/platform/payouts/page.tsx` with:
  - Stats dashboard (pending, completed, avg processing time, platform earnings)
  - Payout requests table with bulk selection
  - Process single or bulk payouts
  - Payout details modal with bank info
  - Status badges and filters
- Created `PayoutController.php` with full CRUD and processing logic

**Platform Reconciliation Module:**
- Created `/app/nextjs-frontend/app/platform/reconciliation/page.tsx` with:
  - Reconciliation stats (match rate, unmatched, disputed)
  - Transaction list with filtering
  - Reconciliation periods tab
  - Manual transaction resolution (match/reject/dispute)
  - Transaction details modal
- Created `ReconciliationController.php` with automated reconciliation logic

**Database Migrations:**
- Created `2025_01_20_000001_create_payouts_and_reconciliation_tables.php`:
  - `payouts` - Tenant payout tracking
  - `tenant_bank_accounts` - Bank details for payouts
  - `reconciliation_periods` - Reconciliation batch tracking
  - `reconciliation_records` - Individual transaction records

**Email Template Editor Enhancements:**
- Added test email modal with recipient address input
- Added HTML formatting button (auto-format code)
- Added download template as HTML file
- Enhanced textarea with cursor position tracking
- Added insertAtCursor function for snippet insertion
- Improved toolbar with more actions

**Documentation Suite Complete:**
- Created `/app/laravel-backend/docs/` directory with:
  - `README.md` - Documentation index and system overview
  - `SETUP.md` - Local development setup guide
  - `DEPLOYMENT_GUIDE.md` - Production deployment instructions
  - `BACKUP_GUIDE.md` - Comprehensive backup and restore guide
  - `API_REFERENCE.md` - Complete API documentation with examples
- All documentation includes:
  - Architecture diagrams
  - Code examples
  - Troubleshooting guides
  - Best practices

### December 2025 (Previous Session - Enterprise Features)
**Production Deployment Guide:**
- Created comprehensive `PRODUCTION_DEPLOYMENT.md` with:
  - Server requirements and setup
  - Let's Encrypt SSL wildcard certificate setup
  - Nginx production configuration with rate limiting
  - Queue workers with Supervisor
  - Database optimization for MySQL 8
  - Redis caching configuration
  - Health monitoring and backup scripts
  - Security hardening (UFW, Fail2Ban)
  - Complete deployment checklist

**Pusher Real-time Integration:**
- Enhanced `BroadcastService.php` with Pusher support
- Added Pusher authentication endpoint
- Created `broadcasting.php` config
- Built `useRealtime.ts` hook with:
  - Pusher WebSocket connection
  - Automatic polling fallback
  - Channel subscription management
  - Progress polling helpers
- Created `ProgressIndicators.tsx` components:
  - `BackupProgressIndicator` - Real-time backup progress
  - `SmsProgressIndicator` - SMS batch progress
  - `CompactProgressBar` - For tables/lists
  - `RealtimeToast` - Notification toasts
- Added `pusher-js` dependency

**WebSocket Notifications & Real-time Updates:**
- Created BroadcastService for real-time notifications (backup, restore, SMS progress)
- Added polling fallback endpoints in NotificationController
- Created broadcast_messages migration for message queue
- Real-time API: `/api/realtime/poll`, `/api/realtime/backup/{id}/progress`

**Message Templates UI with Live Preview:**
- Built full template editor at `/settings/templates`
- Split-view layout: template list, editor, live preview
- Mobile phone mockup preview (realistic iPhone design)
- Desktop/raw preview mode toggle
- Placeholder insertion with one-click
- Character count and SMS segment calculator
- Sample data preview with placeholder replacement

**Apache/Nginx Wildcard Subdomain Configuration:**
- Created Apache config at `config/apache/flexcloud.conf`
- Created Nginx config at `config/nginx/flexcloud.conf`
- Setup script at `scripts/setup-apache.sh`
- Development start script at `scripts/start-dev.sh`
- Comprehensive setup guide: `LOCAL_SETUP_GUIDE.md`
- Support for *.flexcloud.test wildcard domains
- Reverse proxy to Laravel (8000) and Next.js (3000)

**Secure Impersonation:**
- Enhanced TenantController with full impersonation session tracking
- Created impersonation_sessions migration
- Platform admin gets FULL ACCESS when impersonating tenants
- Added exit impersonation endpoint

**Platform Analytics Dashboard:**
- Created PlatformAnalyticsController with comprehensive analytics
- Revenue trends, tenant comparisons, transaction volume analytics
- Platform health metrics and top performers
- Built frontend page at `/platform/analytics`

**Tenant Settings Module (Payment & SMS):**
- Created enhanced TenantSettingController with provider-specific settings
- Support for multiple payment providers (PaymentPoint, PalmPay)
- Support for multiple SMS providers (Termii, Twilio, Africa's Talking)
- Connection testing with step-by-step progress modal
- Secret masking and encrypted storage
- Created frontend at `/settings/integrations`

**Full Audit Logging:**
- Created Auditable trait for automatic audit logging
- Created TenantAuditLogController with stats, filtering, export
- Created tenant audit_logs migration
- Built frontend page at `/settings/audit`

**New Models:**
- PaymentSetting, SmsSetting, MessageTemplate

**New Migrations:**
- enhanced_settings_tables (payment_settings, sms_settings, message_templates)
- impersonation_sessions (platform)
- tenant_audit_logs (tenant)

### December 2025 (Previous Sessions)
- Enhanced Defaulter model with status and notes fields
- Added sendDefaulterReminder method to SMSService
- Added getBalance method for SMS providers
- Created sms_templates and sms_logs migrations
- Added tailwind-merge, clsx, lucide-react dependencies
- Created utils.ts with cn utility function
- Updated PRD documentation

### December 2025 (Earlier Sessions)
- Added ConsultantWalletController and ConsultantWalletService
- Added wallet routes to API
- Created consultant wallet frontend page
- Added wallet link to consultant portal
- Implemented complete multi-tenant architecture
- Created platform and tenant dashboards
- Built all core modules (businesses, invoices, tickets, closings)
- Implemented revenue share system
- Created business and consultant portals
- Added offline sync and printing features
- Implemented RBAC with usePermission hook
- Created enterprise backup and restore system
- Added custom domain management
- Built enhanced glassmorphic sidebars
- Implemented bulk SMS notifications for defaulters
