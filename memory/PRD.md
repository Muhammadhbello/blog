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
- `POST /api/platform/tenants/{id}/impersonate` - Enter tenant portal
- `POST /api/platform/tenants/{id}/suspend` - Suspend tenant
- `POST /api/platform/tenants/{id}/activate` - Activate tenant
- `PUT /api/platform/tenants/{id}/revenue-share` - Update revenue share
- `GET/POST /api/platform/backups/*` - Backup management
- `GET/POST /api/platform/restore/*` - Restore management
- `GET/POST /api/platform/domains/*` - Custom domain management

### Auth Routes
- `POST /api/auth/login` - Login (supports login_type: user/business/consultant)

### Tenant Routes
- `GET/POST /api/revenue-points` - Revenue points CRUD
- `GET/POST /api/closings` - Closings management
- `POST /api/closings/{id}/approve` - Approve closing
- `POST /api/closings/{id}/reject` - Reject closing
- `GET/POST /api/tenant/settings/payment` - Payment settings
- `GET/POST /api/tenant/settings/sms` - SMS settings

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

### P2 (Medium) - IN PROGRESS
- [x] Advanced reporting with charts
- [x] Email notifications
- [ ] Secure Impersonation Logic
- [ ] Full Audit Logging
- [ ] WebSocket Notifications for Backup Progress

### P3 (Low) - BACKLOG
- [ ] Mobile app (React Native)
- [ ] Multi-language support (i18n)
- [ ] Payment Integration (Live - PaymentPoint, PalmPay)
- [ ] SMS Integration (Live - Termii)

---

## Changelog

### December 2025 (Current Session)
- Enhanced Defaulter model with status and notes fields
- Added sendDefaulterReminder method to SMSService
- Added getBalance method for SMS providers
- Created sms_templates and sms_logs migrations
- Added tailwind-merge, clsx, lucide-react dependencies
- Created utils.ts with cn utility function
- Updated PRD documentation

### December 2025 (Previous Sessions)
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
