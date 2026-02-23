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
- [x] Tenant login page
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
- [x] **Invoices** - CRUD, issue, bulk generation, payments
- [x] **Tickets** - Batch creation, sell, verify, reports
- [x] **Closings** - Daily/weekly revenue reconciliation
- [x] **Consultants** - CRUD with portal access
- [x] **Collectors** - Assignment management
- [x] **Defaulters** - Detection and SMS reminders
- [x] **Analytics** - Advanced statistics

### Settings (Per-Tenant)
- [x] **Payment Gateway Settings** (PaymentPoint/PalmPay)
- [x] **SMS Gateway Settings** (Termii)
- [x] **Notification Templates** - SMS templates with placeholders
- [x] **General Settings** - Tenant configuration

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
│   │       ├── PaymentGatewayService.php
│   │       └── SMSService.php
│   ├── database/migrations/
│   │   ├── platform/
│   │   └── tenant/
│   └── routes/api.php
│
└── nextjs-frontend/
    ├── app/
    │   ├── login/
    │   ├── dashboard/
    │   ├── platform/
    │   │   ├── dashboard/
    │   │   ├── tenants/
    │   │   └── users/
    │   ├── businesses/
    │   ├── invoices/
    │   ├── tickets/
    │   ├── closings/
    │   ├── revenue-points/
    │   ├── revenue-items/
    │   ├── departments/
    │   ├── wards/
    │   ├── consultants/
    │   ├── collectors/
    │   ├── defaulters/
    │   ├── analytics/
    │   ├── settings/
    │   └── admin/
    └── components/
        ├── TenantLayout.tsx
        └── PlatformLayout.tsx
```

## API Endpoints

### Platform Routes (`/api/platform/*`)
- `POST /api/platform/tenants` - Create tenant
- `GET /api/platform/tenants` - List tenants
- `POST /api/platform/tenants/{id}/impersonate` - Enter tenant portal
- `POST /api/platform/tenants/{id}/suspend` - Suspend tenant
- `POST /api/platform/tenants/{id}/activate` - Activate tenant

### Tenant Routes
- `GET/POST /api/revenue-points` - Revenue points CRUD
- `GET/POST /api/closings` - Closings management
- `POST /api/closings/{id}/approve` - Approve closing
- `POST /api/closings/{id}/reject` - Reject closing
- `GET/POST /api/tenant/settings/payment` - Payment settings
- `GET/POST /api/tenant/settings/sms` - SMS settings
- `GET/PUT /api/tenant/templates/{id}` - Notification templates

### Business Portal Routes (`/api/business/*`)
- `GET /api/business/dashboard` - Business dashboard
- `GET /api/business/invoices` - Business invoices
- `GET /api/business/profile` - Business profile

## Database Schema

### Platform Database
- `tenants` - Tenant registry
- `platform_users` - Super admin users
- `platform_audit_logs` - Platform actions log

### Tenant Database (per tenant)
- `tenant_users` - Tenant users with roles
- `wards` - Administrative wards
- `departments` - Organization departments
- `revenue_categories` - Revenue categories
- `revenue_items` - Revenue items with tariffs
- `revenue_points` - Collection locations
- `businesses` - Registered businesses
- `invoices` / `invoice_items` / `invoice_payments`
- `ticket_batches` / `tickets` / `ticket_payments`
- `closings` - Revenue reconciliation
- `consultants` / `consultant_assignments`
- `payment_settings` - Per-tenant payment config
- `sms_settings` - Per-tenant SMS config
- `notification_templates` - SMS/email templates

## Testing Credentials

### Platform Admin
- Email: admin@flexcloud.ng
- Password: password123

### Tenant Admin (created per tenant)
- Set during tenant creation

---

## Changelog

### December 2025
- Initial multi-tenant architecture implementation
- Platform admin dashboard and tenant management
- Tenant portal with all core modules
- Revenue points and closings management
- Business and consultant portals
- Per-tenant payment/SMS settings
- Impersonation feature for platform admin
- RBAC implementation

## Roadmap

### P0 (Critical)
- [x] Multi-database tenancy core
- [x] Platform admin dashboard
- [x] Tenant modules (Wards, Departments, Revenue Points)
- [x] Invoicing system
- [x] Ticketing system
- [x] Closings management

### P1 (High)
- [ ] Live payment gateway integration (PaymentPoint/PalmPay)
- [ ] Live SMS integration (Termii)
- [ ] Invoice PDF generation
- [ ] Offline POS sync

### P2 (Medium)
- [ ] Advanced reporting
- [ ] Email notifications
- [ ] Mobile app (React Native)

### P3 (Low)
- [ ] Multi-language support
- [ ] Custom domain per tenant
