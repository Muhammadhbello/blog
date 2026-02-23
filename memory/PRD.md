# FlexCloud - Multi-Tenant Revenue Management SaaS

## Product Requirements Document (PRD)

### Overview
FlexCloud is a multi-tenant Local Government Revenue Intelligence System for Nigerian LGAs. It provides comprehensive revenue collection, invoice management, ticket issuance, consultant management, and advanced analytics.

---

## Architecture

### Multi-Tenant Database Strategy
- **Platform Database:** `flexcloud_platform` - Contains tenants registry, platform users, platform settings
- **Tenant Databases:** Each tenant has isolated database (e.g., `potiskum_tenant`, `damaturu_tenant`)
- **Database Separation:** Complete data isolation between tenants for security and compliance

### Tech Stack
- **Backend:** Laravel 11, PHP 8.3, MySQL 8.0
- **Frontend:** Next.js 14, React 18, TypeScript
- **Auth:** Laravel Sanctum (Token-based)
- **Architecture:** API-First, Multi-Database Tenancy

---

## Implementation Status

### ✅ COMPLETED

#### Phase 1: Core Infrastructure
- [x] Multi-tenant database architecture design
- [x] Platform migrations (platform_users, tenants, platform_audit_logs, platform_settings)
- [x] Tenant migrations (14 migration files covering all modules)
- [x] TenantDatabaseService for dynamic database management
- [x] ResolveTenant middleware for tenant resolution

#### Phase 2: Platform Admin
- [x] Platform Dashboard with statistics
- [x] Tenant Management (CRUD, suspend, activate)
- [x] Subdomain-based tenant provisioning
- [x] Platform User Management
- [x] Platform Audit Logs
- [x] Platform Settings

#### Phase 3: Tenant Admin
- [x] Tenant Layout with sticky sidebar
- [x] User Management for tenants
- [x] Role & Permission Management
- [x] Collector Assignment Management
- [x] Tenant Audit Logs

#### Phase 4: Backend Services
- [x] PaymentGatewayService (PaymentPoint, PalmPay)
- [x] SMSService (Termii, Twilio, Africa's Talking)
- [x] InvoiceService (CRUD, bulk generation, payments)
- [x] TicketService (batches, issuance, verification)
- [x] ClosingService (daily/weekly closings, variance detection)

### ⏳ IN PROGRESS

#### Phase 5: Frontend UI Pages
- [ ] Revenue Points management page
- [ ] Business Registration (with size/category)
- [ ] Invoice Management (bulk, PDF, print)
- [ ] Ticket Batches & Issuance
- [ ] Closings workflow
- [ ] Settings pages (Payment, SMS, Templates)

#### Phase 6: Consultant Portal
- [ ] Consultant Dashboard
- [ ] My Assignments page
- [ ] Ticket selling interface
- [ ] Closing submission

#### Phase 7: Business Portal
- [ ] Business login
- [ ] Business Dashboard (account info, invoices, balance)
- [ ] Payment history

---

## Database Schema

### Platform Database Tables
1. `platform_users` - Super admins, support staff
2. `tenants` - Tenant registry with db_name, subdomain, status
3. `platform_audit_logs` - Platform-level activity tracking
4. `platform_settings` - Global configuration

### Tenant Database Tables
1. `tenant_users` - Staff accounts with roles
2. `wards` - Geographic divisions
3. `departments` - Organizational units
4. `revenue_categories` - Revenue classification
5. `revenue_items` - Individual revenue sources
6. `tariff_rules` - Pricing by business size/category
7. `revenue_points` - Collection locations
8. `businesses` - Registered businesses with virtual accounts
9. `consultants` - External/internal consultants
10. `consultant_assignments` - Point/item assignments
11. `invoices` - Invoice records
12. `invoice_items` - Invoice line items
13. `invoice_payments` - Payment records
14. `ticket_batches` - Controlled ticket ranges
15. `tickets` - Individual tickets
16. `ticket_payments` - Ticket payment records
17. `closings` - Daily/weekly reconciliation
18. `payment_settings` - Per-tenant payment config
19. `sms_settings` - Per-tenant SMS config
20. `notification_templates` - SMS/email templates
21. `tenant_settings` - Tenant configuration
22. `tenant_audit_logs` - Activity tracking
23. `defaulters` - Overdue invoice tracking
24. `sms_logs` - SMS delivery logs
25. `tenant_roles` - Custom roles
26. `tenant_role_user` - Role assignments

---

## Roles & Permissions

### Platform Roles
- **super_admin** - Full platform access
- **support_admin** - Limited platform support
- **finance_admin** - Platform financial reporting

### Tenant Roles
- **chairman** - Full tenant access
- **treasurer** - Financial management, reconciliation
- **hod** - Department-scoped access
- **consultant_admin** - Consultant portal access
- **collector** - Ticket selling only
- **auditor** - Read-only audit access
- **agent_admin** - Business registration only
- **business_user** - Business portal access

---

## API Endpoints Summary

### Platform APIs
```
POST /api/platform/tenants - Create tenant (with database)
GET  /api/platform/tenants - List tenants
PUT  /api/platform/tenants/{id} - Update tenant
POST /api/platform/tenants/{id}/suspend - Suspend tenant
POST /api/platform/tenants/{id}/activate - Activate tenant
GET  /api/platform/users - Platform users
GET  /api/platform/audit-logs - Platform audit logs
GET  /api/platform/settings - Platform settings
```

### Tenant APIs
```
# User Management
GET  /api/tenant/users - List tenant users
POST /api/tenant/users - Create user
PUT  /api/tenant/users/{id} - Update user
GET  /api/tenant/roles - List roles
POST /api/tenant/roles - Create custom role

# Core Resources
CRUD /api/wards
CRUD /api/departments
CRUD /api/revenue-categories
CRUD /api/revenue-items
CRUD /api/revenue-points
CRUD /api/businesses

# Invoices
POST /api/invoices - Create invoice
POST /api/invoices/bulk - Bulk generate
POST /api/invoices/{id}/issue - Issue invoice
POST /api/invoices/{id}/payment - Record payment

# Tickets
POST /api/tickets/batch - Create batch
POST /api/tickets/sell - Sell ticket
POST /api/tickets/verify - Verify ticket

# Closings
POST /api/closings - Submit closing
POST /api/closings/{id}/approve - Approve
POST /api/closings/{id}/reject - Reject
```

---

## Test Credentials

### Platform
- **Super Admin:** admin@flexcloud.com / password123

### Demo Tenant (if created)
- **Chairman:** chairman@demo-lga.gov / password123
- **Treasurer:** treasurer@demo-lga.gov / password123
- **Collector:** collector@demo-lga.gov / password123

---

## Third-Party Integrations

### Payment Gateways (Per Tenant)
- **PaymentPoint** - Virtual account generation
- **PalmPay** - Virtual account generation
- Both support webhook-based payment notifications

### SMS Providers (Per Tenant)
- **Termii** - Primary provider
- **Twilio** - Alternative
- **Africa's Talking** - Alternative

---

## Key Features

### Anti-Fraud Controls (Ticket System)
1. Batch-based ticket issuance with controlled ranges
2. Assignment validation (collector must be assigned to batch)
3. Validity period enforcement
4. Cancellation requires approval
5. Variance detection in closings (>5% flagged)
6. Complete audit trail

### Invoice Features
1. Tariff-based pricing by business size/category
2. Partial payments supported
3. Automatic defaulter tracking
4. Bulk generation by criteria
5. SMS notifications on issue/payment
6. Payment link generation

### Revenue Share Engine
- Configurable per tenant (percentage or fixed)
- Calculated at transaction time
- Separate platform_fee and net_lga_amount tracking

---

## Next Steps (Priority Order)

### P0 - Critical
1. Complete tenant frontend pages (businesses, invoices, tickets)
2. Implement consultant portal
3. Test payment gateway integration

### P1 - Important
1. Business portal for registered businesses
2. Offline POS sync mechanism
3. PDF invoice generation

### P2 - Nice to Have
1. Advanced analytics dashboard
2. Ward heatmap visualization
3. Mobile-responsive optimization

---

## Changelog

### 2025-02-23
- Created comprehensive multi-tenant database architecture
- Implemented 14 tenant migration files
- Created services: TenantDatabase, PaymentGateway, SMS, Invoice, Ticket, Closing
- Built Platform Admin UI with sticky sidebar
- Built Tenant Admin UI with user/role management

### 2025-02-22
- Enhanced tenant model with subdomain support
- Created platform user management
- Created audit log system
- Created collector assignment system

### 2025-02-21
- Initial project setup (Laravel + Next.js)
- Basic authentication with Sanctum
- Core CRUD modules (Wards, Departments, Businesses, Invoices)
