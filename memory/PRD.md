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
- [x] **Tickets** - Batch creation, sell, verify, reports
- [x] **Closings** - Daily/weekly revenue reconciliation
- [x] **Consultants** - CRUD with portal access
- [x] **Collectors** - Assignment management
- [x] **Defaulters** - Detection and SMS reminders
- [x] **Analytics** - Advanced statistics

### Settings (Per-Tenant)
- [x] **Payment Gateway Settings** (PaymentPoint/PalmPay) - Live API integration ready
- [x] **SMS Gateway Settings** (Termii/Twilio/AfricasTalking) - Live API integration ready
- [x] **Notification Templates** - SMS templates with placeholders
- [x] **General Settings** - Tenant configuration

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
    │   │   └── [id]/print/page.tsx (PDF view)
    │   ├── tickets/
    │   ├── closings/page.tsx
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

### Business Portal Routes (`/api/business/*`)
- `GET /api/business/dashboard` - Business dashboard
- `GET /api/business/invoices` - Business invoices
- `GET /api/business/profile` - Business profile

### Consultant Portal Routes (`/api/consultant/*`)
- `GET /api/consultant/dashboard` - Consultant dashboard
- `GET /api/consultant/my-assignments` - My assignments
- `GET /api/consultant/my-tickets` - My tickets
- `GET /api/consultant/my-closings` - My closings

---

## Changelog

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

### P1 (High) - REMAINING
- [ ] Offline POS sync queue
- [x] Advanced bulk invoice operations UI (**COMPLETED**)
- [ ] Receipt/ticket printing for thermal printers

### P2 (Medium)
- [ ] Advanced reporting with charts
- [ ] Email notifications
- [ ] Mobile app (React Native)

### P3 (Low)
- [ ] Multi-language support
- [ ] Custom domain per tenant
