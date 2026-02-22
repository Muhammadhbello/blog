# FlexCloud - Product Requirements Document

## Overview
FlexCloud is a multi-tenant Local Government Revenue Intelligence System built for Nigerian LGAs.

## Tech Stack
- **Backend:** Laravel 11, PHP 8.3, MySQL 8.0
- **Frontend:** Next.js 14, React 18, TypeScript
- **Auth:** Laravel Sanctum (Token-based)
- **Architecture:** Single Database, Multi-Tenant via `tenant_id` scoping

## Implementation Status

### ✅ COMPLETED
- Multi-tenant architecture (tenant_id scoping)
- 7 User roles: Super Admin, Chairman, Treasurer, HOD, Consultant, Collector, Business Owner
- Database schema (19 tables)
- Authentication with Laravel Sanctum
- Platform Admin Dashboard (tenant management)
- Tenant Dashboard with real-time stats
- Core CRUD modules: Wards, Departments, Revenue Items, Businesses, Invoices
- Ticketing System (batch creation, selling)
- Defaulter Management (detection, SMS reminders - MOCKED)
- Consultant Management (assignments, data scoping)
- Analytics Dashboard (charts, statistics)
- Payment Testing with webhook simulation
- Revenue Share Engine (5% platform / 95% LGA)

### ⚠️ MOCKED (Awaiting Live Integration)
- VirtualAccountService (PaymentPoint/PalmPay)
- SMSService (Twilio)

### 📋 BACKLOG
- QR Code Generation & Verification for tickets
- Settings Module (tenant branding, logo, colors)
- Ward Heatmap visualization
- Collector Leaderboard
- Framer Motion animations
- Premium UI components (SmartPaymentCard, RevenueShareVisualizer, DataTablePro)

## Test Credentials
- Super Admin: admin@flexcloud.com / password123
- Chairman: chairman@demo-lga.gov / password123
- Treasurer: treasurer@demo-lga.gov / password123
- Consultant: consultant@demo-lga.gov / password123
- Collector: collector@demo-lga.gov / password123

## Environment Note
This application requires PHP 8.2+, MySQL 8.0+, and Node.js 18+ to run locally.
The Emergent container runs Python/MongoDB, so local testing requires downloading and running with proper stack.
