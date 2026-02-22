# FlexCloud - Multi-Tenant Local Government Revenue Intelligence System

## 🎯 Overview

FlexCloud is a comprehensive fintech-grade revenue management system designed for Nigerian Local Government Areas (LGAs). It features multi-tenant architecture, virtual account integration, and intelligent revenue sharing.

## ✨ Key Features

### Platform (Super Admin)
- **Tenant Management**: Create and manage multiple LGA tenants
- **Revenue Share Configuration**: Set percentage or fixed revenue splits per tenant
- **Tenant Status Control**: Activate, suspend, or deactivate tenants
- **Global Analytics**: Monitor platform-wide performance

### Tenant Dashboard
- **Wards Management**: Geographical ward organization
- **Revenue Items**: Configure revenue sources (tickets, invoices, licenses)
- **Business Registry**: Register businesses with auto-generated virtual accounts
- **Invoice Management**: Generate and track invoices with status monitoring
- **Payment Testing**: Simulate complete payment flow with webhook integration
- **Real-time Analytics**: Dashboard with revenue statistics and category breakdowns

## 🏗️ Architecture

### Tech Stack
- **Backend**: Laravel 11 (PHP 8.2)
- **Frontend**: Next.js 14 with TypeScript
- **Database**: MySQL 8.0 (MariaDB)
- **Authentication**: Laravel Sanctum (Token-based)
- **Payment Integration**: PaymentPoint & PalmPay (Mock implementations)
- **SMS**: Twilio integration ready
- **Styling**: Tailwind CSS with glassmorphism design

### Database Structure (19 Tables)
1. tenants - LGA tenant management
2. users - Multi-role user authentication
3. wards - Geographical divisions
4. departments - Organizational structure
5. revenue_categories - Revenue classification
6. revenue_items - Revenue sources configuration
7. revenue_points - Collection locations
8. tariff_rules - Dynamic pricing rules
9. businesses - Business registry
10. registrants - Citizen registration
11. consultant_assignments - Consultant management
12. invoices - Invoice generation & tracking
13. ticket_batches - Ticket batch management
14. tickets - Individual ticket tracking
15. transactions - Payment records with revenue split
16. audit_logs - Complete audit trail
17. defaulters - Overdue payment tracking

## 🚀 Getting Started

### Prerequisites
- PHP 8.2+
- MySQL 8.0+
- Node.js 20+
- Composer
- npm/yarn

### Quick Start

```bash
# Clone and navigate to project
cd /app

# Start all services
chmod +x start-servers.sh
./start-servers.sh

# Access the application
# Frontend: http://localhost:3001
# Backend API: http://localhost:8002/api
```

### Login Credentials

**Platform Admin (Super Admin)**
- Email: `admin@flexcloud.com`
- Password: `password123`
- Dashboard: `/platform`

**Tenant Users**
- Chairman: `chairman@demo-lga.gov` / `password123`
- Treasurer: `treasurer@demo-lga.gov` / `password123`
- Consultant: `consultant@demo-lga.gov` / `password123`
- Collector: `collector@demo-lga.gov` / `password123`
- Dashboard: `/dashboard`

## 📱 Application Flow

### Platform Admin Flow
1. Login with super admin credentials
2. Redirected to `/platform` dashboard
3. Manage tenants (create, activate, suspend)
4. Configure revenue sharing per tenant
5. Monitor global platform health

### Tenant User Flow
1. Login with tenant user credentials
2. Redirected to `/dashboard`
3. Access based on role:
   - **Chairman**: Full access to all modules
   - **Treasurer**: Financial oversight and reports
   - **HOD**: Department-specific revenue management
   - **Consultant**: Scoped access to assigned items only
   - **Collector**: Ticket sales and field operations

### Payment Testing Flow
1. Go to **Payment Testing** page
2. Register a business (auto-generates virtual account)
3. Create an invoice for the business
4. Simulate payment via webhook
5. View revenue split: 5% FlexCloud / 95% LGA
6. See updated dashboard statistics

## 🔗 API Endpoints

### Authentication
```
POST /api/login - User login
POST /api/register - User registration
POST /api/logout - User logout
GET  /api/me - Get current user
```

### Platform Admin (Super Admin Only)
```
GET    /api/tenants - List all tenants
POST   /api/tenants - Create new tenant
GET    /api/tenants/{id} - Get tenant details
PUT    /api/tenants/{id} - Update tenant
DELETE /api/tenants/{id} - Delete tenant
```

### Tenant Operations
```
# Wards
GET/POST/PUT/DELETE /api/wards

# Departments
GET/POST/PUT/DELETE /api/departments

# Revenue Categories
GET/POST/PUT/DELETE /api/revenue-categories

# Revenue Items
GET/POST/PUT/DELETE /api/revenue-items

# Businesses (with Virtual Account generation)
GET/POST/PUT/DELETE /api/businesses

# Invoices
GET/POST/PUT/DELETE /api/invoices

# Dashboard
GET /api/dashboard/stats - Revenue analytics
```

### Webhooks
```
POST /api/webhooks/payment - Payment notification handler
```

## 🎨 UI/UX Design

### Design Philosophy
- **Glassmorphism**: Modern backdrop-blur effects
- **Gradient Accents**: Blue-purple for tenant, purple-pink for platform
- **Responsive**: Mobile-first design approach
- **Accessibility**: WCAG 2.1 compliant
- **Dark Mode**: Platform admin uses dark theme, tenants use light theme

### Key Components
- **UniversalModal**: Glassmorphism backdrop with spring animations
- **SmartPaymentCard**: Virtual account display with copy functionality
- **DataCards**: Hover effects with shadow elevation
- **StatusBadges**: Color-coded status indicators

## 💰 Revenue Share Model

### Configuration Options
1. **Percentage Model**: e.g., 5% platform / 95% LGA
2. **Fixed Model**: e.g., ₦50,000/month flat fee

### Calculation Flow
```
Transaction Amount: ₦100,000

Percentage Model (5%):
- Platform Fee: ₦5,000 (5%)
- LGA Amount: ₦95,000 (95%)

Fixed Model (₦500 monthly):
- Platform Fee: ₦500
- LGA Amount: ₦99,500
```

## 🔒 Security Features

- **Multi-tenant Isolation**: Strict tenant_id scoping on all queries
- **Role-Based Access Control**: 7 distinct roles with granular permissions
- **Token Authentication**: Laravel Sanctum with secure token management
- **Audit Logging**: Complete action tracking with IP addresses
- **Data Encryption**: Sensitive data encrypted at rest
- **CORS Protection**: Configured for frontend-backend communication

## 📊 Key Metrics Dashboard

- Total Revenue (Net LGA Amount)
- Transaction Count
- Platform Fees Collected
- Revenue by Category Breakdown
- Period: Current Month

---

Built with ❤️ for Nigerian Local Governments
