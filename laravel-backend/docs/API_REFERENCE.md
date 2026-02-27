# FlexCloud API Reference

Base URL: `https://your-domain.com/api`

All endpoints require authentication unless otherwise noted.

## Authentication

### Login
```http
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "token": "1|abc123...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "chairman"
  }
}
```

### Logout
```http
POST /api/logout
Authorization: Bearer {token}
```

### Get Current User
```http
GET /api/me
Authorization: Bearer {token}
```

---

## Platform Admin Endpoints

All platform endpoints require `super_admin` role.

### Tenants

#### List Tenants
```http
GET /api/platform/tenants
Authorization: Bearer {token}

Query Parameters:
- page (int): Page number
- per_page (int): Items per page (default: 15)
- search (string): Search by name or slug
- status (string): active|suspended
```

#### Create Tenant
```http
POST /api/platform/tenants
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Potiskum LGA",
  "slug": "potiskum",
  "admin_email": "chairman@potiskum.gov.ng",
  "admin_name": "Chairman Name",
  "settings": {
    "currency": "NGN",
    "timezone": "Africa/Lagos"
  }
}
```

#### Get Tenant Details
```http
GET /api/platform/tenants/{id}
Authorization: Bearer {token}
```

#### Update Tenant
```http
PUT /api/platform/tenants/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Name",
  "settings": {...}
}
```

#### Suspend Tenant
```http
POST /api/platform/tenants/{id}/suspend
Authorization: Bearer {token}

{
  "reason": "Non-payment"
}
```

#### Activate Tenant
```http
POST /api/platform/tenants/{id}/activate
Authorization: Bearer {token}
```

#### Update Revenue Share
```http
PUT /api/platform/tenants/{id}/revenue-share
Authorization: Bearer {token}

{
  "platform_share_percent": 2.5,
  "minimum_monthly": 50000
}
```

#### Impersonate Tenant
```http
POST /api/platform/tenants/{id}/impersonate
Authorization: Bearer {token}

Response:
{
  "token": "impersonation_token...",
  "expires_at": "2025-01-15T12:00:00Z"
}
```

### Platform Analytics

```http
GET /api/platform/analytics/dashboard
GET /api/platform/analytics/revenue-trends
GET /api/platform/analytics/tenant-comparison
GET /api/platform/analytics/transaction-volume
GET /api/platform/analytics/health
```

### Backup & Restore

See [Backup Guide](./BACKUP_GUIDE.md) for detailed documentation.

```http
GET /api/platform/backups
GET /api/platform/backups/stats
POST /api/platform/backups/platform
POST /api/platform/backups/tenant/{slug}
GET /api/platform/backups/tenant/{slug}
GET /api/platform/backups/download/{id}
DELETE /api/platform/backups/{id}

GET /api/platform/restore/history
POST /api/platform/restore/tenant/{slug}
POST /api/platform/restore/confirm/{id}
GET /api/platform/restore/progress/{id}
```

### Custom Domains

```http
GET /api/platform/domains
GET /api/platform/domains/tenant/{slug}
POST /api/platform/domains/tenant/{slug}
POST /api/platform/domains/tenant/{slug}/verify
DELETE /api/platform/domains/tenant/{slug}
POST /api/platform/domains/tenant/{slug}/ssl
```

---

## Tenant Endpoints

### Dashboard

```http
GET /api/dashboard/stats
Authorization: Bearer {token}

Response:
{
  "total_businesses": 1234,
  "total_revenue": 15000000,
  "revenue_this_month": 2500000,
  "pending_invoices": 456,
  "recent_payments": [...],
  "revenue_by_category": [...]
}
```

### Businesses

```http
GET /api/businesses
POST /api/businesses
GET /api/businesses/{id}
PUT /api/businesses/{id}
DELETE /api/businesses/{id}

Query Parameters (GET):
- search (string): Search by name or registration number
- ward_id (int): Filter by ward
- category_id (int): Filter by category
- status (string): active|inactive|suspended
- page, per_page
```

#### Create Business
```http
POST /api/businesses
Content-Type: application/json

{
  "business_name": "ABC Ventures",
  "owner_name": "John Doe",
  "owner_phone": "08012345678",
  "owner_email": "john@abc.com",
  "address": "123 Main Street",
  "ward_id": 1,
  "category_id": 2,
  "registration_number": "BN-2025-001"
}
```

### Invoices

```http
GET /api/invoices
POST /api/invoices
GET /api/invoices/{id}
PUT /api/invoices/{id}
DELETE /api/invoices/{id}
```

#### Create Invoice
```http
POST /api/invoices
Content-Type: application/json

{
  "business_id": 123,
  "items": [
    {
      "revenue_item_id": 1,
      "description": "Annual License Fee",
      "amount": 50000
    }
  ],
  "due_date": "2025-02-15",
  "notes": "Payment for 2025"
}
```

### Tickets

```http
POST /api/tickets/batch
GET /api/tickets/batches
GET /api/tickets
POST /api/tickets/sell
POST /api/tickets/verify
```

#### Create Ticket Batch
```http
POST /api/tickets/batch
Content-Type: application/json

{
  "revenue_item_id": 5,
  "quantity": 100,
  "unit_price": 500,
  "start_number": 1001
}
```

#### Sell Ticket
```http
POST /api/tickets/sell
Content-Type: application/json

{
  "ticket_number": "TKT-2025-001001",
  "buyer_name": "Customer Name",
  "buyer_phone": "08012345678"
}
```

### Closings

```http
GET /api/closings
POST /api/closings
GET /api/closings/{id}
POST /api/closings/{id}/approve
POST /api/closings/{id}/reject
GET /api/closings/pending
GET /api/closings/stats
```

#### Submit Closing
```http
POST /api/closings
Content-Type: application/json

{
  "date": "2025-01-15",
  "cash_collected": 150000,
  "tickets_sold": [
    {"ticket_id": 1, "quantity": 50},
    {"ticket_id": 2, "quantity": 30}
  ],
  "notes": "Daily closing for January 15"
}
```

### Defaulters

```http
POST /api/defaulters/detect
GET /api/defaulters
GET /api/defaulters/stats
GET /api/defaulters/templates
POST /api/defaulters/preview-message
POST /api/defaulters/{id}/remind
POST /api/defaulters/bulk-remind
POST /api/defaulters/bulk-filtered
PUT /api/defaulters/{id}/status
```

### Tenant Settings

#### Payment Settings
```http
GET /api/tenant/settings/payment
POST /api/tenant/settings/payment
POST /api/tenant/settings/payment/test
```

#### SMS Settings
```http
GET /api/tenant/settings/sms
POST /api/tenant/settings/sms
POST /api/tenant/settings/sms/test
```

#### Message Templates
```http
GET /api/tenant/templates
PUT /api/tenant/templates/{id}
POST /api/tenant/templates/preview

Response (GET):
{
  "templates": [
    {
      "id": "uuid",
      "channel": "sms",
      "key": "invoice_reminder",
      "name": "Invoice Reminder",
      "subject": null,
      "body": "Dear {{business_name}}, you have an outstanding invoice...",
      "is_active": true,
      "placeholders": {
        "{{business_name}}": "Business name",
        "{{amount}}": "Invoice amount",
        "{{due_date}}": "Due date"
      }
    }
  ]
}
```

### Tenant Users

```http
GET /api/tenant/users
POST /api/tenant/users
GET /api/tenant/users/{id}
PUT /api/tenant/users/{id}
DELETE /api/tenant/users/{id}
POST /api/tenant/users/{id}/assign-roles
```

### Tenant Audit Logs

```http
GET /api/tenant/audit-logs
GET /api/tenant/audit-logs/stats
GET /api/tenant/audit-logs/modules
GET /api/tenant/audit-logs/actions
GET /api/tenant/audit-logs/entity/{type}/{id}
GET /api/tenant/audit-logs/export
```

---

## Consultant Wallet

```http
GET /api/wallet/my
GET /api/wallet/transactions
POST /api/wallet/withdraw

# Admin
GET /api/wallet-admin/stats
GET /api/wallet-admin/withdrawals
POST /api/wallet-admin/withdrawals/{id}/approve
POST /api/wallet-admin/withdrawals/{id}/reject
```

---

## Reports

```http
GET /api/reports/dashboard-analytics
GET /api/reports/invoices
GET /api/reports/tickets
GET /api/reports/closings
GET /api/reports/defaulters
GET /api/reports/export?type=invoices&format=csv
```

---

## Email Notifications

```http
GET /api/notifications/email/settings
POST /api/notifications/email/settings
POST /api/notifications/email/test
GET /api/notifications/email/templates
PUT /api/notifications/email/templates/{id}
GET /api/notifications/email/logs
GET /api/notifications/email/stats
POST /api/notifications/email/bulk
POST /api/notifications/email/resend/{id}
```

---

## Real-time Updates

### Pusher Authentication
```http
POST /api/realtime/pusher/auth
```

### Polling Fallback
```http
GET /api/realtime/poll
GET /api/realtime/backup/{id}/progress
GET /api/realtime/restore/{id}/progress
GET /api/realtime/sms/{id}/progress
```

---

## Error Responses

### Standard Error Format
```json
{
  "message": "Error description",
  "errors": {
    "field": ["Validation error message"]
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Server Error |

---

## Rate Limiting

- Authentication endpoints: 5 requests/minute
- API endpoints: 60 requests/minute
- Bulk operations: 10 requests/minute

Rate limit headers:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1642003200
```
