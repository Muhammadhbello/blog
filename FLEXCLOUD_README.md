# FlexCloud - Multi-Tenant Local Government Revenue Intelligence System

## 🎯 Overview

FlexCloud is a comprehensive fintech-grade revenue management system designed for Nigerian Local Government Areas (LGAs). It features multi-tenant architecture, virtual account integration, offline POS support, and intelligent revenue sharing.

## ✨ Key Features

### Platform (Super Admin)
- **Tenant Management**: Create and manage multiple LGA tenants
- **Revenue Share Configuration**: Set percentage or fixed revenue splits
- **Tenant Impersonation**: Enter any tenant's portal as admin
- **Global Analytics**: Monitor platform-wide performance

### Tenant Dashboard
- **Wards & Departments**: Organizational structure management
- **Revenue Management**: Categories, items, points, tariffs
- **Business Registry**: Auto-generated virtual accounts
- **Invoice System**: Single & bulk generation with PDF export
- **Ticketing System**: Batch creation, selling, verification
- **Closings**: Daily/weekly revenue reconciliation
- **Defaulter Management**: Detection & automated reminders
- **Reports & Analytics**: Comprehensive dashboards

### Advanced Features
- **Offline POS Sync**: Download tickets, sell offline, sync later
- **Thermal Printing**: 58mm/80mm receipt printing support
- **Email Notifications**: SMTP/SendGrid/Mailgun integration
- **SMS Notifications**: Termii/Twilio/AfricasTalking
- **Multi-Portal**: Separate portals for businesses & consultants

---

## 🏗️ Architecture

### Tech Stack
| Layer | Technology |
|-------|------------|
| **Backend** | Laravel 11 (PHP 8.3) |
| **Frontend** | Next.js 14 (TypeScript) |
| **Database** | MySQL 8.0 (Multi-database) |
| **Auth** | Laravel Sanctum (Token-based) |
| **Styling** | Tailwind CSS + Shadcn/UI |
| **Payments** | PaymentPoint / PalmPay |
| **SMS** | Termii / Twilio / AfricasTalking |
| **Email** | SMTP / SendGrid / Mailgun |

### Multi-Tenant Architecture
```
┌─────────────────────────────────────────────────┐
│              FlexCloud Platform                 │
│  ┌──────────────────────────────────────────┐  │
│  │         Platform Database                │  │
│  │   (tenants, platform_users, settings)    │  │
│  └──────────────────────────────────────────┘  │
│                      │                          │
│    ┌─────────────────┼─────────────────┐       │
│    ▼                 ▼                 ▼       │
│  ┌─────┐         ┌─────┐         ┌─────┐      │
│  │LGA 1│         │LGA 2│         │LGA N│      │
│  │ DB  │         │ DB  │         │ DB  │      │
│  └─────┘         └─────┘         └─────┘      │
└─────────────────────────────────────────────────┘
```

### Database Structure (25+ Tables)

**Platform Database:**
- `tenants` - LGA tenant management
- `platform_users` - Super admin users
- `platform_settings` - Platform configuration

**Tenant Database (per LGA):**
- `users`, `wards`, `departments`
- `revenue_categories`, `revenue_items`, `revenue_points`
- `businesses`, `invoices`, `invoice_items`, `invoice_payments`
- `ticket_batches`, `tickets`, `transactions`
- `closings`, `consultant_assignments`, `defaulters`
- `payment_settings`, `sms_settings`, `email_settings`
- `notification_templates`, `audit_logs`
- `offline_devices`, `offline_sync_logs`

---

## 🚀 Getting Started

### Prerequisites
- PHP 8.2+ with extensions
- MySQL 8.0+
- Node.js 18+
- Composer 2.x
- npm/yarn

### Quick Start

```bash
# Backend setup
cd laravel-backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --port=8002

# Frontend setup (new terminal)
cd nextjs-frontend
yarn install
echo "NEXT_PUBLIC_API_URL=http://localhost:8002/api" > .env.local
yarn dev
```

### Access URLs
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8002/api

---

## 🔐 Login Credentials

### Platform Admin
```
Email: admin@flexcloud.com
Password: password123
Dashboard: /platform
```

### Tenant Users (Demo LGA)
| Role | Email | Password |
|------|-------|----------|
| Chairman | chairman@demo-lga.gov | password123 |
| Treasurer | treasurer@demo-lga.gov | password123 |
| HOD | hod@demo-lga.gov | password123 |
| Collector | collector@demo-lga.gov | password123 |
| Consultant | consultant@demo-lga.gov | password123 |
| Auditor | auditor@demo-lga.gov | password123 |

### Portal Logins
- **Business Portal:** Login at `/login` (Business tab)
- **Consultant Portal:** Login at `/login` (Consultant tab)

---

## 📱 Application Modules

### Core Modules
| Module | Route | Description |
|--------|-------|-------------|
| Dashboard | `/dashboard` | Real-time stats & charts |
| Wards | `/wards` | Geographical divisions |
| Departments | `/departments` | Organizational units |
| Revenue Items | `/revenue-items` | Revenue sources |
| Revenue Points | `/revenue-points` | Collection locations |
| Businesses | `/businesses` | Business registry |
| Invoices | `/invoices` | Invoice management |
| Bulk Invoices | `/invoices/bulk` | Mass invoice generation |
| Tickets | `/tickets` | Ticket batch management |
| Closings | `/closings` | Daily reconciliation |
| Defaulters | `/defaulters` | Overdue management |
| Reports | `/reports` | Comprehensive reports |
| Analytics | `/analytics` | Charts & statistics |

### Settings & Admin
| Module | Route | Description |
|--------|-------|-------------|
| Settings | `/settings` | General configuration |
| Email Settings | `/settings/email` | Email notifications |
| Users | `/admin/users` | User management |
| Roles | `/admin/roles` | Role management |
| Audit Logs | `/admin/audit-logs` | Activity tracking |

### Special Features
| Feature | Route | Description |
|---------|-------|-------------|
| Offline Sync | `/offline-sync` | POS offline management |
| Print | `/print` | Thermal receipt printing |
| Business Portal | `/business-portal` | Business owner dashboard |
| Consultant Portal | `/consultant-portal` | Consultant dashboard |

---

## 🔗 Key API Endpoints

### Authentication
```
POST /api/auth/login       # Multi-type login
POST /api/logout           # Logout
GET  /api/me               # Current user
```

### Platform Admin
```
GET/POST /api/platform/tenants
POST /api/platform/tenants/{id}/impersonate
POST /api/platform/tenants/{id}/suspend
```

### Bulk Operations
```
GET  /api/bulk-invoices/businesses
POST /api/bulk-invoices/preview
POST /api/bulk-invoices/generate
```

### Offline Sync
```
GET  /api/offline/tickets
POST /api/offline/sync-tickets
POST /api/offline/register-device
```

### Printing
```
GET /api/print/ticket/{id}
GET /api/print/invoice/{id}
GET /api/print/payment/{id}/receipt
```

### Email Notifications
```
GET/POST /api/notifications/email/settings
POST /api/notifications/email/test
POST /api/notifications/email/bulk
```

---

## 💰 Revenue Share Model

### Configuration Options
1. **Percentage Model**: e.g., 5% platform / 95% LGA
2. **Fixed Model**: e.g., ₦50,000/month flat fee

### Example Calculation
```
Transaction Amount: ₦100,000

Percentage Model (5%):
├── Platform Fee: ₦5,000 (5%)
└── LGA Amount: ₦95,000 (95%)
```

---

## 🔒 Security Features

- **Multi-tenant Isolation**: Strict database separation
- **Role-Based Access Control**: 7 distinct roles
- **Token Authentication**: Laravel Sanctum
- **Audit Logging**: Complete action tracking
- **Data Encryption**: Sensitive data protection
- **CORS Protection**: Configured security headers

---

## 🖨️ Printing Support

### Supported Paper Sizes
- **58mm** - Small thermal printers
- **80mm** - Standard POS printers
- **A4** - Full invoices

### Print Types
- Ticket receipts
- Payment receipts
- Full invoices (PDF)
- Closing summaries

---

## 📶 Offline POS Support

### Workflow
1. **Register Device**: Register POS terminal
2. **Download**: Download assigned tickets
3. **Sell Offline**: Local sales tracking
4. **Sync**: Upload when online
5. **Verify**: Review sync history

---

## 📧 Notification Channels

### Email (Configurable)
- SMTP (Gmail, custom)
- SendGrid
- Mailgun

### SMS (Configurable)
- Termii (Nigeria)
- Twilio
- AfricasTalking

---

## 📁 Project Structure

```
/app/
├── laravel-backend/          # PHP Backend
│   ├── app/Http/Controllers/ # 22 Controllers
│   ├── app/Models/           # 14+ Models
│   ├── app/Services/         # 7 Services
│   ├── database/migrations/  # Platform & Tenant
│   └── routes/api.php        # All routes
│
├── nextjs-frontend/          # React Frontend
│   ├── app/                  # 25+ Pages
│   ├── components/           # UI Components
│   ├── contexts/             # Auth Context
│   └── lib/                  # API Client
│
├── FLEXCLOUD_README.md       # This file
├── FLEXCLOUD_LOCAL_SETUP.md  # Setup guide
└── memory/PRD.md             # Requirements
```

---

## 📥 Download & Deploy

### Download from Emergent
1. Click **"⋮" menu** (three dots)
2. Select **"Download Code"**
3. Extract the zip file

### Deployment Requirements
- PHP 8.2+ hosting (Laravel Forge, DigitalOcean)
- MySQL 8.0+ database
- Node.js 18+ for frontend build
- SSL certificate for production

---

## 🎨 UI/UX Design

### Design System
- **Theme**: Glassmorphism with gradients
- **Colors**: Blue-purple tenant, purple-pink platform
- **Components**: Shadcn/UI library
- **Icons**: Lucide React
- **Responsive**: Mobile-first approach

### Key Features
- Impersonation banner for platform admin
- Real-time dashboard updates
- Toast notifications
- Modal confirmations
- Skeleton loading states

---

## 📊 Reports Available

| Report | Description |
|--------|-------------|
| Invoice Report | Revenue from invoices by period |
| Ticket Report | Ticket sales by batch/location |
| Closing Report | Daily/weekly reconciliation |
| Defaulter Report | Overdue payments analysis |
| Revenue Analytics | Category & ward breakdown |

---

## 🆘 Support

For setup assistance or feature requests:
- Check `FLEXCLOUD_LOCAL_SETUP.md` for detailed instructions
- Review `memory/PRD.md` for requirements
- Contact the development team

---

**Built with ❤️ for Nigerian Local Governments**

*Version 1.0 - December 2025*
