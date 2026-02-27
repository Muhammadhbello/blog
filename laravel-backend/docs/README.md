# FlexCloud Documentation Index

Welcome to the FlexCloud Local Government Revenue Intelligence System documentation.

## Quick Links

| Document | Description |
|----------|-------------|
| [Setup Guide](./SETUP.md) | Local development environment setup |
| [Deployment Guide](./DEPLOYMENT_GUIDE.md) | Production deployment instructions |
| [Backup Guide](./BACKUP_GUIDE.md) | Backup and restore operations |
| [API Reference](./API_REFERENCE.md) | Complete API documentation |

## System Overview

FlexCloud is a multi-tenant SaaS platform for Local Government Areas (LGAs) in Nigeria to manage:

- **Business Registration** - Register and track businesses
- **Revenue Collection** - Issue invoices and collect payments
- **Ticket Management** - Daily ticket sales and tracking
- **Defaulter Management** - Track and notify defaulters
- **Consultant Management** - Assign and manage revenue consultants
- **Analytics & Reports** - Comprehensive revenue analytics

## Architecture

```
FlexCloud Platform
├── Platform (Super Admin)
│   ├── Tenant Management
│   ├── Platform Analytics
│   ├── Revenue Sharing
│   ├── Backup & Restore
│   └── Custom Domains
│
└── Tenant (LGA Admin)
    ├── Dashboard
    ├── Businesses
    ├── Invoices
    ├── Tickets
    ├── Closings
    ├── Defaulters
    ├── Consultants
    ├── Users & Roles
    └── Settings
```

## Multi-Database Architecture

```
                    MySQL Server
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ platform │  │ tenant_1 │  │ tenant_n │
    │ database │  │ database │  │ database │
    └──────────┘  └──────────┘  └──────────┘
    
    flexcloud_platform
    - tenants
    - platform_users
    - platform_settings
    - impersonation_sessions
    
    flexcloud_{slug}
    - businesses
    - invoices
    - tickets
    - closings
    - users
    - ...
```

## User Roles

### Platform Roles
- **Super Admin** - Full platform access

### Tenant Roles
- **Chairman** - Full tenant access
- **Treasurer** - Financial operations
- **HOD** - Department head
- **Auditor** - Read-only analytics
- **Collector** - Daily collections
- **Consultant** - Assigned revenue areas

## Getting Help

- Check the relevant documentation first
- Review troubleshooting sections
- Contact support with specific error messages

## Contributing

When adding new features:
1. Update API documentation
2. Add migration files
3. Update this index if needed
