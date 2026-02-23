# FlexCloud - Multi-Tenant Revenue Management SaaS

## Overview
FlexCloud is a multi-tenant SaaS platform for Local Government Revenue Intelligence, built with Laravel (PHP 8.3) backend and Next.js (React 18, TypeScript) frontend.

## Architecture

### Multi-Database Tenancy
- **Platform Database**: `flexcloud_platform` - Manages tenants and platform users
- **Tenant Databases**: `flexcloud_tenant_{slug}` - Each tenant has isolated database

### Tech Stack
- **Backend**: Laravel 11, PHP 8.3
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Database**: MySQL 8.0 (multi-database)
- **Authentication**: Laravel Sanctum

## Implemented Features

### Platform Admin (Super Admin)
- [x] Platform login page
- [x] Tenant management (CRUD)
- [x] Tenant creation with automatic:
  - Database provisioning
  - Migration running
  - Admin user seeding
- [x] Tenant status management (suspend/activate)
- [x] **Enter Tenant Portal** (Impersonation) - Platform admin can access any tenant portal
- [x] Platform audit logs
- [x] Platform settings management
- [x] Revenue share configuration per tenant

### Tenant Portal
- [x] Tenant login page with role tabs (Staff/Business/Consultant)
- [x] Dashboard with stats cards
- [x] Sidebar navigation (independently scrollable)
- [x] **Impersonation Banner** - Shows when platform admin is viewing tenant

### Tenant Modules
- [x] **Wards** - CRUD management
- [x] **Departments** - CRUD with HOD assignment
- [x] **Revenue Categories** - CRUD management
- [x] **Revenue Items** - CRUD with tariff configuration
- [x] **Revenue Points** - CRUD for collection locations
- [x] **Businesses** - Registration with categories/sizes
- [x] **Invoices** - CRUD, issue, bulk generation, payments, **PDF printing**
- [x] **Bulk Invoices** - Advanced UI for bulk invoice generation
- [x] **Tickets** - Batch creation, sell, verify, reports
- [x] **Closings** - Daily/weekly revenue reconciliation
- [x] **Consultants** - CRUD with portal access
- [x] **Collectors** - Assignment management
- [x] **Defaulters** - Detection and SMS reminders
- [x] **Analytics** - Advanced statistics
- [x] **Reports** - Comprehensive reports dashboard
- [x] **Offline POS Sync** - Download tickets, offline sales, sync queue
- [x] **Receipt/Ticket Printing** - Thermal printer support (58mm/80mm)

### Settings (Per-Tenant)
- [x] **Payment Gateway Settings** (PaymentPoint/PalmPay) - Live API integration ready
- [x] **SMS Gateway Settings** (Termii/Twilio/AfricasTalking) - Live API integration ready
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
│   │   │   │   ├── AuthController.php (with business/consultant login)
│   │   │   │   ├── TenantController.php (with impersonation)
│   │   │   │   ├── BusinessController.php (with portal methods)
│   │   │   │   ├── ConsultantController.php (with dashboard)
│   │   │   │   ├── BulkInvoiceController.php
│   │   │   │   ├── ReportsController.php
│   │   │   │   ├── InvoiceController.php
│   │   │   │   ├── TicketController.php
│   │   │   │   ├── RevenuePointController.php
│   │   │   │   ├── ClosingController.php
│   │   │   │   ├── TenantSettingController.php
│   │   │   │   └── ...
│   │   │   └── Middleware/
│   │   │       ├── ResolveTenant.php
│   │   │       └── CheckRole.php
│   │   ├── Models/
│   │   └── Services/
│   │       ├── TenantDatabaseService.php
│   │       ├── InvoiceService.php
│   │       ├── TicketService.php
│   │       ├── ClosingService.php
│   │       ├── PaymentGatewayService.php (PaymentPoint/PalmPay)
│   │       └── SMSService.php (Termii/Twilio/AfricasTalking)
│   ├── database/migrations/
│   │   ├── platform/
│   │   └── tenant/
│   └── routes/api.php
│
└── nextjs-frontend/
    ├── app/
    │   ├── login/page.tsx (with Staff/Business/Consultant tabs)
    │   ├── dashboard/
    │   ├── platform/
    │   │   ├── dashboard/
    │   │   ├── tenants/ (with Enter Portal button)
    │   │   └── users/
    │   ├── business-portal/page.tsx (Business dashboard)
    │   ├── consultant-portal/page.tsx (Consultant dashboard)
    │   ├── businesses/
    │   ├── invoices/
    │   │   ├── page.tsx
    │   │   ├── bulk/page.tsx (Advanced Bulk Invoice UI)
    │   │   └── [id]/print/page.tsx (PDF view)
    │   ├── tickets/
    │   ├── closings/page.tsx
    │   ├── reports/page.tsx
    │   ├── revenue-points/
    │   ├── revenue-items/
    │   ├── departments/page.tsx
    │   ├── wards/
    │   ├── consultants/
    │   ├── collectors/
    │   ├── defaulters/
    │   ├── analytics/
    │   ├── settings/
    │   └── admin/
    └── components/
        ├── TenantLayout.tsx (with impersonation banner)
        └── PlatformLayout.tsx
```

## API Endpoints

### Platform Routes (`/api/platform/*`)
- `POST /api/platform/tenants` - Create tenant
- `GET /api/platform/tenants` - List tenants
- `POST /api/platform/tenants/{id}/impersonate` - Enter tenant portal
- `POST /api/platform/tenants/{id}/suspend` - Suspend tenant
- `POST /api/platform/tenants/{id}/activate` - Activate tenant

### Auth Routes
- `POST /api/auth/login` - Login (supports login_type: user/business/consultant)

### Tenant Routes
- `GET/POST /api/revenue-points` - Revenue points CRUD
- `GET/POST /api/closings` - Closings management
- `POST /api/closings/{id}/approve` - Approve closing
- `POST /api/closings/{id}/reject` - Reject closing
- `GET/POST /api/tenant/settings/payment` - Payment settings
- `GET/POST /api/tenant/settings/sms` - SMS settings
- `GET/PUT /api/tenant/templates/{id}` - Notification templates

### Bulk Invoice Routes (`/api/bulk-invoices/*`)
- `GET /api/bulk-invoices/businesses` - Get businesses with filters
- `POST /api/bulk-invoices/preview` - Preview invoices before generation
- `POST /api/bulk-invoices/generate` - Generate bulk invoices
- `GET /api/bulk-invoices/history` - Get bulk generation history

### Reports Routes (`/api/reports/*`)
- `GET /api/reports/dashboard-analytics` - Dashboard analytics
- `GET /api/reports/invoices` - Invoice report
- `GET /api/reports/tickets` - Ticket report
- `GET /api/reports/closings` - Closing report
- `GET /api/reports/defaulters` - Defaulter report
- `GET /api/reports/export` - Export reports to CSV

### Business Portal Routes (`/api/business/*`)
- `GET /api/business/dashboard` - Business dashboard
- `GET /api/business/invoices` - Business invoices
- `GET /api/business/profile` - Business profile

### Consultant Portal Routes (`/api/consultant/*`)
- `GET /api/consultant/dashboard` - Consultant dashboard
- `GET /api/consultant/my-assignments` - My assignments
- `GET /api/consultant/my-tickets` - My tickets
- `GET /api/consultant/my-closings` - My closings

### Offline Sync Routes (`/api/offline/*`)
- `GET /api/offline/tickets` - Get tickets for offline download
- `POST /api/offline/sync-tickets` - Sync offline ticket sales
- `GET /api/offline/sync-history` - Get sync history
- `POST /api/offline/register-device` - Register a POS device

### Email Notification Routes (`/api/notifications/*`)
- `GET /api/notifications/email/settings` - Get email settings
- `POST /api/notifications/email/settings` - Save email settings
- `POST /api/notifications/email/test` - Send test email
- `GET /api/notifications/email/templates` - Get email templates
- `PUT /api/notifications/email/templates/{id}` - Update template
- `GET /api/notifications/email/logs` - Get email logs
- `GET /api/notifications/email/stats` - Get email statistics
- `POST /api/notifications/email/bulk` - Send bulk email

### Print Routes (`/api/print/*`)
- `GET /api/print/ticket/{id}` - Get ticket print data
- `GET /api/print/batch/{id}/tickets` - Get batch tickets for printing
- `GET /api/print/payment/{id}/receipt` - Get payment receipt data
- `GET /api/print/invoice/{id}` - Get invoice print data
- `GET /api/print/closing/{id}/receipt` - Get closing receipt data
- `POST /api/print/settings` - Update print settings

---

## Changelog

### December 2025 (Session 4)
- Added **Offline POS Sync** system:
  - Device registration for POS terminals
  - Download tickets for offline sales
  - Queue management for pending syncs
  - Sync history and tracking
  - Local storage integration
- Added **Email Notifications** management:
  - SMTP/SendGrid/Mailgun configuration
  - Email template management
  - Email logs and statistics
  - Bulk email sending to businesses
  - Test email functionality
- Added **Receipt/Ticket Printing** for thermal printers:
  - Support for 58mm and 80mm thermal paper
  - Ticket receipt printing
  - Payment receipt printing
  - Invoice printing (A4)
  - Closing receipt printing
  - QR code support
  - Print settings configuration
- Added backend controllers: `NotificationController`, `PrintController`
- Added database migration for email_settings, email_logs, offline_devices, offline_sync_logs
- Updated sidebar with "Offline Sync" and "Email Notifications" links

### December 2025 (Session 3)
- Added **Advanced Bulk Invoice UI** at `/invoices/bulk`:
  - Business filtering by ward, department, size, business type
  - Multiple revenue item selection
  - Tariff configuration by business size (small/medium/large)
  - Preview before generation
  - Batch invoice generation with results summary
  - SMS notification option
- Added "Bulk Invoices" link to sidebar navigation
- Added "Bulk Generate" button to Invoices page
- Added "Reports" link to sidebar navigation

### December 2025 (Session 2)
- Added Business Portal frontend with virtual account, invoices, payments
- Added Consultant Portal frontend with stats, assignments, tickets, closings
- Added Invoice PDF/Print view
- Enhanced login page with Staff/Business/Consultant tabs
- Added Print button to invoices list
- Updated AuthController for multi-type login
- Updated ConsultantController with dashboard endpoint
- Updated BusinessController with portal endpoints
- Live Payment Gateway integration (PaymentPoint/PalmPay) - API ready
- Live SMS Gateway integration (Termii/Twilio/AfricasTalking) - API ready

### December 2025 (Session 1)
- Initial multi-tenant architecture implementation
- Platform admin dashboard and tenant management
- Tenant portal with all core modules
- Revenue points and closings management
- Per-tenant payment/SMS settings
- Impersonation feature for platform admin
- RBAC implementation

## Roadmap

### P0 (Critical) - COMPLETED
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

### P1 (High) - COMPLETED
- [x] Offline POS sync queue (**COMPLETED**)
- [x] Advanced bulk invoice operations UI (**COMPLETED**)
- [x] Receipt/ticket printing for thermal printers (**COMPLETED**)

### P2 (Medium) - COMPLETED
- [x] Advanced reporting with charts (**COMPLETED**)
- [x] Email notifications (**COMPLETED**)
- [ ] Mobile app (React Native)

### P3 (Low)
- [ ] Multi-language support
- [ ] Custom domain per tenant

## Environment Note
This project uses Laravel (PHP) backend and Next.js frontend. The code is located in:
- `/app/laravel-backend/` - Laravel API backend
- `/app/nextjs-frontend/` - Next.js frontend

**Note:** This environment may require PHP/MySQL setup to run the Laravel backend. The frontend can be tested independently with mocked API data.
