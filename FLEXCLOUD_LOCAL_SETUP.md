# FlexCloud - Complete System Inventory & Local Setup Guide

## 📦 Complete System Inventory

### Backend (Laravel 11 + PHP 8.3)
**Location:** `/app/laravel-backend/`

#### ✅ Models (14+ Complete)
| Model | Status | Description |
|-------|--------|-------------|
| `Tenant.php` | ✅ Complete | Multi-tenant LGA management |
| `User.php` | ✅ Complete | Multi-role authentication |
| `Ward.php` | ✅ Complete | Geographical divisions |
| `Department.php` | ✅ Complete | Organizational structure |
| `RevenueCategory.php` | ✅ Complete | Revenue classification |
| `RevenueItem.php` | ✅ Complete | Revenue sources (tickets, invoices) |
| `RevenuePoint.php` | ✅ Complete | Collection locations |
| `Business.php` | ✅ Complete | Business registry with virtual accounts |
| `Invoice.php` | ✅ Complete | Invoice generation & tracking |
| `TicketBatch.php` | ✅ Complete | Batch ticket management |
| `Ticket.php` | ✅ Complete | Individual ticket tracking |
| `Transaction.php` | ✅ Complete | Payment records with revenue split |
| `ConsultantAssignment.php` | ✅ Complete | Consultant management |
| `Defaulter.php` | ✅ Complete | Overdue payment tracking |
| `Closing.php` | ✅ Complete | Daily/weekly revenue reconciliation |

#### ✅ Controllers (22 Complete)
| Controller | Status | Endpoints |
|------------|--------|-----------|
| `AuthController` | ✅ Complete | login (staff/business/consultant), logout, register, me |
| `TenantController` | ✅ Complete | CRUD + impersonation |
| `WardController` | ✅ Complete | CRUD for wards |
| `DepartmentController` | ✅ Complete | CRUD for departments |
| `RevenueCategoryController` | ✅ Complete | CRUD for categories |
| `RevenueItemController` | ✅ Complete | CRUD for revenue items |
| `RevenuePointController` | ✅ Complete | CRUD for revenue points |
| `BusinessController` | ✅ Complete | CRUD + virtual account + portal |
| `InvoiceController` | ✅ Complete | CRUD + PDF + payments |
| `TicketController` | ✅ Complete | Batch creation, selling, verification |
| `DefaulterController` | ✅ Complete | Detection, SMS reminders |
| `ConsultantController` | ✅ Complete | Assignments + portal dashboard |
| `DashboardController` | ✅ Complete | Revenue statistics |
| `AnalyticsController` | ✅ Complete | Advanced analytics |
| `ClosingController` | ✅ Complete | Daily/weekly closings |
| `BulkInvoiceController` | ✅ Complete | Bulk invoice generation |
| `ReportsController` | ✅ Complete | Comprehensive reports |
| `OfflineSyncController` | ✅ Complete | POS offline sync |
| `NotificationController` | ✅ Complete | Email notifications |
| `PrintController` | ✅ Complete | Receipt/ticket printing |
| `TenantSettingController` | ✅ Complete | Per-tenant settings |
| `WebhookController` | ✅ Complete | Payment webhook handling |

#### ✅ Services (7 Complete)
| Service | Status | Description |
|---------|--------|-------------|
| `RevenueShareService` | ✅ Complete | 5% platform / 95% LGA split calculation |
| `VirtualAccountService` | ✅ Mocked | PaymentPoint/PalmPay integration |
| `SmsService` | ✅ Complete | Termii/Twilio/AfricasTalking integration |
| `EmailService` | ✅ Complete | SMTP/SendGrid/Mailgun integration |
| `PaymentGatewayService` | ✅ Complete | PaymentPoint/PalmPay API |
| `InvoiceService` | ✅ Complete | Invoice generation logic |
| `TicketService` | ✅ Complete | Ticket batch management |

#### ✅ Database Migrations (23+ Complete)
**Platform Migrations:**
- `tenants`, `platform_users`, `platform_settings`

**Tenant Migrations:**
- `users`, `wards`, `departments`
- `revenue_categories`, `revenue_items`, `revenue_points`, `tariff_rules`
- `businesses`, `consultant_assignments`
- `invoices`, `invoice_items`, `invoice_payments`
- `ticket_batches`, `tickets`, `transactions`
- `closings`, `audit_logs`, `defaulters`
- `payment_settings`, `sms_settings`, `notification_templates`
- `email_settings`, `email_logs`
- `offline_devices`, `offline_sync_logs`
- `tenant_settings`

---

### Frontend (Next.js 14 + TypeScript)
**Location:** `/app/nextjs-frontend/`

#### ✅ Pages (25+ Complete)
| Page | Route | Status | Description |
|------|-------|--------|-------------|
| Login | `/login` | ✅ Complete | Staff/Business/Consultant tabs |
| Dashboard | `/dashboard` | ✅ Complete | Real-time stats |
| Platform Admin | `/platform` | ✅ Complete | Super admin dashboard |
| Platform Tenants | `/platform/tenants` | ✅ Complete | Tenant management + Enter Portal |
| Wards | `/wards` | ✅ Complete | CRUD management |
| Departments | `/departments` | ✅ Complete | CRUD management |
| Revenue Items | `/revenue-items` | ✅ Complete | Categories & items |
| Revenue Points | `/revenue-points` | ✅ Complete | Collection locations |
| Businesses | `/businesses` | ✅ Complete | Business registry |
| Invoices | `/invoices` | ✅ Complete | Invoice management |
| **Bulk Invoices** | `/invoices/bulk` | ✅ Complete | Advanced bulk generation |
| Invoice Print | `/invoices/[id]/print` | ✅ Complete | PDF invoice view |
| Tickets | `/tickets` | ✅ Complete | Batch management |
| Closings | `/closings` | ✅ Complete | Revenue reconciliation |
| Defaulters | `/defaulters` | ✅ Complete | Defaulter management |
| Consultants | `/consultants` | ✅ Complete | Assignment management |
| Analytics | `/analytics` | ✅ Complete | Charts & statistics |
| Reports | `/reports` | ✅ Complete | Comprehensive reports |
| **Business Portal** | `/business-portal` | ✅ Complete | Business owner dashboard |
| **Consultant Portal** | `/consultant-portal` | ✅ Complete | Consultant dashboard |
| Settings | `/settings` | ✅ Complete | General settings |
| **Email Settings** | `/settings/email` | ✅ Complete | Email configuration |
| **Offline Sync** | `/offline-sync` | ✅ Complete | POS offline management |
| **Print** | `/print` | ✅ Complete | Thermal receipt printing |
| Admin Users | `/admin/users` | ✅ Complete | User management |
| Admin Roles | `/admin/roles` | ✅ Complete | Role management |

#### ✅ Core Components
- `TenantLayout` - Sidebar with impersonation banner
- `PlatformLayout` - Platform admin layout
- `AuthContext` - Authentication state management
- `apiClient` - Axios wrapper with auth interceptors
- Toast notifications with Sonner
- Shadcn/UI components

---

## 🔐 Test Credentials

### Platform Admin (Super Admin)
```
Email: admin@flexcloud.com
Password: password123
Dashboard: /platform
```

### Tenant Users (Demo LGA)
```
Chairman: chairman@demo-lga.gov / password123
Treasurer: treasurer@demo-lga.gov / password123
HOD: hod@demo-lga.gov / password123
Consultant: consultant@demo-lga.gov / password123
Collector: collector@demo-lga.gov / password123
Auditor: auditor@demo-lga.gov / password123
Dashboard: /dashboard
```

### Business Portal
```
Email: business@example.com
Password: password123
Dashboard: /business-portal
```

### Consultant Portal
```
Email: consultant@demo-lga.gov
Password: password123
Dashboard: /consultant-portal
```

---

## 🛠️ Local Setup Instructions

### Prerequisites
- PHP 8.2+ with extensions: `mbstring`, `xml`, `curl`, `mysql`, `zip`
- Composer 2.x
- MySQL 8.0+ or MariaDB 10.x
- Node.js 18+ and npm/yarn
- Git

### Step 1: Clone/Download the Project
Download from Emergent using "Download Code" option.

### Step 2: Backend Setup (Laravel)
```bash
# Navigate to backend
cd laravel-backend

# Install PHP dependencies
composer install

# Copy environment file
cp .env.example .env

# Configure database in .env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=flexcloud_platform
DB_USERNAME=root
DB_PASSWORD=your_password

# For multi-tenant, add:
TENANT_DB_HOST=127.0.0.1
TENANT_DB_USERNAME=root
TENANT_DB_PASSWORD=your_password

# Generate application key
php artisan key:generate

# Create platform database
mysql -u root -p -e "CREATE DATABASE flexcloud_platform;"

# Run platform migrations
php artisan migrate --path=database/migrations/platform

# Seed the database with test data
php artisan db:seed

# Start the Laravel server
php artisan serve --port=8002
```

### Step 3: Frontend Setup (Next.js)
```bash
# Navigate to frontend (in new terminal)
cd nextjs-frontend

# Install dependencies
yarn install
# or
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:8002/api" > .env.local

# Start development server
yarn dev
# or
npm run dev
```

### Step 4: Access the Application
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8002/api
- Login with credentials above

---

## 🧪 Testing Flows

### 1. Platform Admin Flow
1. Login with `admin@flexcloud.com`
2. View `/platform` dashboard
3. Manage tenants (create, activate, suspend)
4. Click "Enter Portal" to impersonate tenant admin
5. See impersonation banner at top

### 2. Tenant Admin Flow
1. Login with `chairman@demo-lga.gov`
2. View `/dashboard` with real-time stats
3. Navigate to modules via sidebar:
   - `/wards` - Manage wards
   - `/departments` - Manage departments
   - `/businesses` - Register businesses
   - `/invoices` - Generate invoices
   - `/invoices/bulk` - Bulk invoice generation
   - `/tickets` - Create ticket batches
   - `/closings` - Manage daily closings
   - `/defaulters` - Manage defaulters
   - `/reports` - View reports
   - `/analytics` - View charts

### 3. Business Portal Flow
1. Login with business credentials at `/login` (Business tab)
2. View `/business-portal` dashboard
3. See virtual account details
4. View invoice history
5. Track payment history

### 4. Consultant Portal Flow
1. Login with consultant credentials at `/login` (Consultant tab)
2. View `/consultant-portal` dashboard
3. See today's collections
4. Manage ticket sales
5. Submit daily closings

### 5. Offline POS Flow
1. Go to `/offline-sync`
2. Register your POS device
3. Download available tickets
4. Sell tickets offline (simulated)
5. Sync when back online
6. View sync history

### 6. Bulk Invoice Flow
1. Go to `/invoices/bulk`
2. Filter businesses by ward, department, size
3. Select businesses and revenue items
4. Configure tariff by business size
5. Preview invoices
6. Generate and view results

### 7. Email Notification Flow
1. Go to `/settings/email`
2. Configure SMTP/SendGrid/Mailgun
3. Send test email
4. Manage templates
5. Send bulk emails to businesses

### 8. Receipt Printing Flow
1. Create/sell a ticket
2. Click print icon
3. Opens `/print?type=ticket&id=123`
4. Configure paper size (58mm/80mm)
5. Print to thermal printer

---

## 📁 Complete Project Structure
```
/app/
├── laravel-backend/                    # Laravel 11 Backend
│   ├── app/
│   │   ├── Http/Controllers/Api/       # 22 Controllers
│   │   │   ├── AuthController.php
│   │   │   ├── TenantController.php
│   │   │   ├── BusinessController.php
│   │   │   ├── InvoiceController.php
│   │   │   ├── BulkInvoiceController.php
│   │   │   ├── TicketController.php
│   │   │   ├── ClosingController.php
│   │   │   ├── OfflineSyncController.php
│   │   │   ├── NotificationController.php
│   │   │   ├── PrintController.php
│   │   │   ├── ReportsController.php
│   │   │   └── ...
│   │   ├── Models/                     # 14+ Models
│   │   ├── Services/                   # 7 Services
│   │   │   ├── EmailService.php
│   │   │   ├── SMSService.php
│   │   │   ├── PaymentGatewayService.php
│   │   │   └── ...
│   │   └── Middleware/
│   │       ├── ResolveTenant.php
│   │       └── CheckRole.php
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── platform/               # Platform migrations
│   │   │   └── tenant/                 # Tenant migrations
│   │   └── seeders/
│   └── routes/api.php                  # All API routes
│
├── nextjs-frontend/                    # Next.js 14 Frontend
│   ├── app/
│   │   ├── login/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── platform/
│   │   │   ├── dashboard/page.tsx
│   │   │   └── tenants/page.tsx
│   │   ├── business-portal/page.tsx
│   │   ├── consultant-portal/page.tsx
│   │   ├── invoices/
│   │   │   ├── page.tsx
│   │   │   ├── bulk/page.tsx
│   │   │   └── [id]/print/page.tsx
│   │   ├── offline-sync/page.tsx
│   │   ├── settings/
│   │   │   └── email/page.tsx
│   │   ├── print/page.tsx
│   │   └── ...
│   ├── components/
│   │   ├── TenantLayout.tsx
│   │   ├── PlatformLayout.tsx
│   │   └── ui/                         # Shadcn components
│   ├── contexts/AuthContext.tsx
│   └── lib/api.ts
│
├── FLEXCLOUD_README.md                 # Overview documentation
├── FLEXCLOUD_LOCAL_SETUP.md            # This file
└── memory/PRD.md                       # Product Requirements
```

---

## 🔗 API Endpoints Reference

### Authentication
```
POST /api/auth/login          # Login (supports login_type: user/business/consultant)
POST /api/logout              # Logout
GET  /api/me                  # Get current user
```

### Platform Admin
```
GET    /api/platform/tenants              # List tenants
POST   /api/platform/tenants              # Create tenant
POST   /api/platform/tenants/{id}/impersonate  # Enter tenant portal
POST   /api/platform/tenants/{id}/suspend      # Suspend tenant
POST   /api/platform/tenants/{id}/activate     # Activate tenant
```

### Tenant Modules
```
# Core CRUD endpoints
GET/POST/PUT/DELETE /api/wards
GET/POST/PUT/DELETE /api/departments
GET/POST/PUT/DELETE /api/revenue-categories
GET/POST/PUT/DELETE /api/revenue-items
GET/POST/PUT/DELETE /api/revenue-points
GET/POST/PUT/DELETE /api/businesses
GET/POST/PUT/DELETE /api/invoices
GET/POST/PUT/DELETE /api/tickets
GET/POST/PUT/DELETE /api/closings
GET/POST/PUT/DELETE /api/consultants
GET/POST/PUT/DELETE /api/defaulters
```

### Bulk Operations
```
GET  /api/bulk-invoices/businesses    # Filter businesses
POST /api/bulk-invoices/preview       # Preview generation
POST /api/bulk-invoices/generate      # Generate invoices
GET  /api/bulk-invoices/history       # Generation history
```

### Offline Sync
```
GET  /api/offline/tickets             # Download tickets
POST /api/offline/sync-tickets        # Sync offline sales
GET  /api/offline/sync-history        # Sync history
POST /api/offline/register-device     # Register POS device
```

### Email Notifications
```
GET  /api/notifications/email/settings    # Get settings
POST /api/notifications/email/settings    # Save settings
POST /api/notifications/email/test        # Send test
GET  /api/notifications/email/templates   # Get templates
PUT  /api/notifications/email/templates/{id}  # Update template
GET  /api/notifications/email/logs        # Get logs
POST /api/notifications/email/bulk        # Send bulk
```

### Printing
```
GET /api/print/ticket/{id}                # Ticket receipt data
GET /api/print/batch/{id}/tickets         # Batch tickets
GET /api/print/payment/{id}/receipt       # Payment receipt
GET /api/print/invoice/{id}               # Invoice data
GET /api/print/closing/{id}/receipt       # Closing receipt
```

### Reports
```
GET /api/reports/dashboard-analytics      # Dashboard stats
GET /api/reports/invoices                 # Invoice report
GET /api/reports/tickets                  # Ticket report
GET /api/reports/closings                 # Closing report
GET /api/reports/defaulters               # Defaulter report
GET /api/reports/export                   # CSV export
```

---

## ⚠️ External Integrations (Configurable)

### Payment Gateways
- **PaymentPoint** - Virtual account generation
- **PalmPay** - Alternative payment provider
- Configure in: `/settings` → Payment Settings

### SMS Providers
- **Termii** (Recommended for Nigeria)
- **Twilio**
- **AfricasTalking**
- Configure in: `/settings` → SMS Settings

### Email Providers
- **SMTP** (Gmail, custom server)
- **SendGrid**
- **Mailgun**
- Configure in: `/settings/email`

---

## 📥 How to Download

In the Emergent chat interface:
1. Click the **"⋮" menu** (three dots) 
2. Select **"Download Code"**
3. The complete `/app` folder will be zipped and downloaded

The download includes:
- `/laravel-backend/` - Complete Laravel application
- `/nextjs-frontend/` - Complete Next.js application
- All documentation files

---

## 🆘 Troubleshooting

### Backend Issues
```bash
# Clear Laravel cache
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Regenerate autoload
composer dump-autoload

# Check logs
tail -f storage/logs/laravel.log
```

### Frontend Issues
```bash
# Clear Next.js cache
rm -rf .next
yarn dev

# Check for TypeScript errors
yarn build
```

### Database Issues
```bash
# Reset migrations
php artisan migrate:fresh --seed

# Create tenant database manually
php artisan tenant:create {slug}
```

---

## 📞 Support

For issues or feature requests, please create an issue in the repository or contact the development team.

**Built with ❤️ for Nigerian Local Governments**
