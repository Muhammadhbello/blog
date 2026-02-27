# FlexCloud Backup & Restore System Guide

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backup Types](#backup-types)
4. [Performing Backups](#performing-backups)
5. [Restore Operations](#restore-operations)
6. [Automated Backups](#automated-backups)
7. [Backup Storage](#backup-storage)
8. [Retention Policies](#retention-policies)
9. [Monitoring & Alerts](#monitoring--alerts)
10. [Disaster Recovery](#disaster-recovery)
11. [API Reference](#api-reference)
12. [Troubleshooting](#troubleshooting)

---

## Overview

FlexCloud's Enterprise Backup & Restore System provides comprehensive data protection for the multi-tenant platform. The system supports:

- **Platform-level backups**: Central `flexcloud_platform` database
- **Tenant-level backups**: Individual tenant databases (`flexcloud_{slug}`)
- **Zero-downtime operations**: Backups run without service interruption
- **Point-in-time recovery**: Restore to any available backup point
- **Real-time progress tracking**: WebSocket/polling progress updates

### Key Features

| Feature | Description |
|---------|-------------|
| Multi-tenant isolation | Each tenant's backup is completely isolated |
| Incremental backups | Only changed data is backed up (MySQL binlog) |
| Compression | All backups are gzip compressed |
| Encryption | Backups can be encrypted at rest |
| Retention management | Automatic cleanup of old backups |
| Progress tracking | Real-time progress via Pusher or polling |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Backup Controller                        │
│                  /api/platform/backups/*                    │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ BackupService│  │RestoreService│  │BroadcastSvc  │
    │              │  │              │  │ (Progress)   │
    └──────────────┘  └──────────────┘  └──────────────┘
              │               │               │
              ▼               ▼               ▼
    ┌──────────────────────────────────────────────────┐
    │                  MySQL Databases                  │
    ├──────────────────────────────────────────────────┤
    │  flexcloud_platform  │  flexcloud_potiskum  │... │
    └──────────────────────────────────────────────────┘
              │
              ▼
    ┌──────────────────────────────────────────────────┐
    │              Backup Storage                       │
    │  /var/backups/flexcloud/                         │
    │  ├── platform/                                   │
    │  │   └── platform_2025-01-15_093000.sql.gz      │
    │  └── tenants/                                    │
    │      ├── potiskum_2025-01-15_093000.sql.gz      │
    │      └── damaturu_2025-01-15_093000.sql.gz      │
    └──────────────────────────────────────────────────┘
```

---

## Backup Types

### 1. Platform Backup

Backs up the central `flexcloud_platform` database containing:
- Tenant registry
- Platform users
- Platform settings
- Revenue share configurations
- Audit logs
- Impersonation sessions

**Frequency**: Daily (recommended) + before major updates

**Command (CLI)**:
```bash
php artisan backup:platform --compress
```

**API**:
```http
POST /api/platform/backups/platform
Authorization: Bearer {token}

{
  "compress": true,
  "notify": true
}
```

### 2. Tenant Backup

Backs up an individual tenant's database containing:
- Businesses
- Invoices & payments
- Tickets
- Closings
- Users & roles
- Settings & templates

**Frequency**: Daily for active tenants

**Command (CLI)**:
```bash
php artisan backup:tenant potiskum --compress
```

**API**:
```http
POST /api/platform/backups/tenant/{slug}
Authorization: Bearer {token}

{
  "compress": true,
  "include_storage": false
}
```

### 3. Full System Backup

Backs up platform + all tenant databases in a single operation.

**Command (CLI)**:
```bash
php artisan backup:full --compress --parallel=4
```

---

## Performing Backups

### Via Admin Dashboard

1. Navigate to **Platform Admin → Backups**
2. Click **Create Backup**
3. Select backup type:
   - Platform Only
   - Specific Tenant
   - All Tenants
4. Configure options:
   - Compression (recommended)
   - Include storage files
   - Email notification
5. Click **Start Backup**
6. Monitor progress in real-time

### Via API

```bash
# Platform backup
curl -X POST "https://flexcloud.ng/api/platform/backups/platform" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"compress": true}'

# Tenant backup
curl -X POST "https://flexcloud.ng/api/platform/backups/tenant/potiskum" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"compress": true}'

# Check progress
curl "https://flexcloud.ng/api/realtime/backup/{backup_id}/progress" \
  -H "Authorization: Bearer $TOKEN"
```

### Via Artisan Commands

```bash
# Interactive backup
php artisan backup:create

# Platform backup
php artisan backup:platform

# Specific tenant
php artisan backup:tenant potiskum

# All tenants
php artisan backup:all-tenants

# Full system (platform + all tenants)
php artisan backup:full
```

---

## Restore Operations

### Pre-Restore Checklist

1. ✅ Verify backup file integrity
2. ✅ Check available disk space
3. ✅ Review restoration target
4. ✅ Notify affected users (optional)
5. ✅ Enable maintenance mode (automatic)

### Restore Process

```
┌─────────────────┐
│  Initiate       │
│  Restore        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validate       │
│  Backup File    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Enable         │
│  Maintenance    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Create         │
│  Pre-Restore    │
│  Backup         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Drop & Recreate│
│  Database       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Import         │
│  Backup Data    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Run            │
│  Migrations     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Disable        │
│  Maintenance    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Verify &       │
│  Complete       │
└─────────────────┘
```

### Via Admin Dashboard

1. Navigate to **Platform Admin → Backups**
2. Find the backup to restore
3. Click **Restore** button
4. Review restore details
5. Confirm with **"I understand this will overwrite existing data"**
6. Click **Start Restore**
7. Wait for completion (tenant will be in maintenance mode)

### Via API

```bash
# List available backups for a tenant
curl "https://flexcloud.ng/api/platform/backups/tenant/potiskum/available" \
  -H "Authorization: Bearer $TOKEN"

# Initiate restore
curl -X POST "https://flexcloud.ng/api/platform/restore/tenant/potiskum" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "backup_id": "backup_123456",
    "create_pre_restore_backup": true
  }'

# Confirm restore (required after initiation)
curl -X POST "https://flexcloud.ng/api/platform/restore/confirm/{restore_id}" \
  -H "Authorization: Bearer $TOKEN"

# Check restore progress
curl "https://flexcloud.ng/api/realtime/restore/{restore_id}/progress" \
  -H "Authorization: Bearer $TOKEN"
```

### Via Artisan Commands

```bash
# Interactive restore
php artisan restore:tenant potiskum

# Restore from specific backup
php artisan restore:tenant potiskum --backup=potiskum_2025-01-15_093000.sql.gz

# Force restore (skip confirmation)
php artisan restore:tenant potiskum --force
```

---

## Automated Backups

### Cron Schedule

Add to your crontab (`crontab -e`):

```cron
# Daily platform backup at 2:00 AM
0 2 * * * cd /var/www/flexcloud/current/laravel-backend && php artisan backup:platform >> /var/log/flexcloud/backup.log 2>&1

# Daily tenant backups at 3:00 AM
0 3 * * * cd /var/www/flexcloud/current/laravel-backend && php artisan backup:all-tenants >> /var/log/flexcloud/backup.log 2>&1

# Weekly full backup on Sunday at 1:00 AM
0 1 * * 0 cd /var/www/flexcloud/current/laravel-backend && php artisan backup:full >> /var/log/flexcloud/backup.log 2>&1

# Cleanup old backups daily at 4:00 AM
0 4 * * * cd /var/www/flexcloud/current/laravel-backend && php artisan backup:cleanup >> /var/log/flexcloud/backup.log 2>&1
```

### Laravel Scheduler

In `app/Console/Kernel.php`:

```php
protected function schedule(Schedule $schedule): void
{
    // Daily platform backup
    $schedule->command('backup:platform')
        ->dailyAt('02:00')
        ->onOneServer()
        ->withoutOverlapping();

    // Daily tenant backups
    $schedule->command('backup:all-tenants')
        ->dailyAt('03:00')
        ->onOneServer()
        ->withoutOverlapping();

    // Weekly full backup
    $schedule->command('backup:full')
        ->weeklyOn(0, '01:00')
        ->onOneServer()
        ->withoutOverlapping();

    // Daily cleanup
    $schedule->command('backup:cleanup')
        ->dailyAt('04:00')
        ->onOneServer();
}
```

---

## Backup Storage

### Local Storage (Default)

```
/var/backups/flexcloud/
├── platform/
│   ├── platform_2025-01-15_020000.sql.gz
│   ├── platform_2025-01-14_020000.sql.gz
│   └── ...
├── tenants/
│   ├── potiskum_2025-01-15_030000.sql.gz
│   ├── potiskum_2025-01-14_030000.sql.gz
│   ├── damaturu_2025-01-15_030000.sql.gz
│   └── ...
└── full/
    ├── full_2025-01-12_010000.tar.gz
    └── ...
```

### Cloud Storage (S3/GCS)

Configure in `.env`:

```env
BACKUP_DISK=s3
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_DEFAULT_REGION=eu-west-1
AWS_BUCKET=flexcloud-backups
```

### Hybrid (Local + Cloud)

```env
BACKUP_DISK=local
BACKUP_CLOUD_SYNC=true
BACKUP_CLOUD_DISK=s3
```

---

## Retention Policies

### Default Retention

| Backup Type | Retention Period |
|-------------|------------------|
| Daily backups | 7 days |
| Weekly backups | 4 weeks |
| Monthly backups | 12 months |

### Custom Retention

Configure in `config/backup.php`:

```php
return [
    'retention' => [
        'daily' => 7,      // Keep 7 daily backups
        'weekly' => 4,     // Keep 4 weekly backups
        'monthly' => 12,   // Keep 12 monthly backups
    ],
    
    'cleanup' => [
        'strategy' => 'default', // default, aggressive, conservative
        'delete_oldest_when_full' => true,
        'max_storage_mb' => 50000, // 50GB
    ],
];
```

### Manual Cleanup

```bash
# Clean up old backups
php artisan backup:cleanup

# Clean up specific tenant
php artisan backup:cleanup --tenant=potiskum

# Dry run (show what would be deleted)
php artisan backup:cleanup --dry-run
```

---

## Monitoring & Alerts

### Dashboard Monitoring

The Platform Admin dashboard shows:
- Last backup status for each tenant
- Storage usage
- Failed backup alerts
- Backup history with download links

### Email Notifications

```php
// In BackupService.php
$this->notifyOnComplete($backup, [
    'admin@flexcloud.ng',
    'backup-alerts@flexcloud.ng',
]);
```

### Webhook Notifications

```env
BACKUP_WEBHOOK_URL=https://your-webhook.com/backup-status
```

### Health Check Endpoint

```http
GET /api/platform/backups/health

Response:
{
  "status": "healthy",
  "last_platform_backup": "2025-01-15T02:00:00Z",
  "last_tenant_backups": {
    "potiskum": "2025-01-15T03:00:00Z",
    "damaturu": "2025-01-15T03:05:00Z"
  },
  "storage_used_mb": 2450,
  "storage_available_mb": 47550,
  "issues": []
}
```

---

## Disaster Recovery

### Recovery Time Objective (RTO)

| Scenario | Target RTO |
|----------|------------|
| Single tenant restore | 15 minutes |
| Platform restore | 30 minutes |
| Full system restore | 2 hours |

### Recovery Point Objective (RPO)

| Backup Strategy | RPO |
|-----------------|-----|
| Daily backups only | 24 hours |
| Daily + hourly binlog | 1 hour |
| Real-time replication | 0 (zero data loss) |

### Disaster Recovery Procedure

1. **Assess the situation**
   - Identify affected databases
   - Determine data loss timeframe

2. **Prepare recovery environment**
   ```bash
   # Create fresh database if needed
   mysql -e "CREATE DATABASE flexcloud_potiskum_recovery"
   ```

3. **Restore from backup**
   ```bash
   # Decompress and restore
   gunzip -c backup.sql.gz | mysql flexcloud_potiskum_recovery
   ```

4. **Apply binary logs (if available)**
   ```bash
   mysqlbinlog /var/log/mysql/binlog.* | mysql flexcloud_potiskum_recovery
   ```

5. **Verify data integrity**
   ```bash
   php artisan backup:verify --database=flexcloud_potiskum_recovery
   ```

6. **Switch to recovered database**
   ```bash
   # Rename databases
   mysql -e "RENAME TABLE flexcloud_potiskum TO flexcloud_potiskum_old"
   mysql -e "RENAME TABLE flexcloud_potiskum_recovery TO flexcloud_potiskum"
   ```

7. **Clear caches and restart**
   ```bash
   php artisan cache:clear
   php artisan config:cache
   sudo supervisorctl restart all
   ```

---

## API Reference

### Backup Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/platform/backups` | List all backups |
| GET | `/api/platform/backups/stats` | Get backup statistics |
| POST | `/api/platform/backups/platform` | Create platform backup |
| POST | `/api/platform/backups/tenant/{slug}` | Create tenant backup |
| GET | `/api/platform/backups/tenant/{slug}` | Get tenant's backups |
| GET | `/api/platform/backups/download/{id}` | Download backup file |
| DELETE | `/api/platform/backups/{id}` | Delete a backup |
| POST | `/api/platform/backups/cleanup` | Run cleanup |

### Restore Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/platform/restore/history` | Restore history |
| POST | `/api/platform/restore/tenant/{slug}` | Initiate restore |
| POST | `/api/platform/restore/confirm/{id}` | Confirm restore |
| GET | `/api/platform/restore/progress/{id}` | Get progress |

### Real-time Progress

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/realtime/backup/{id}/progress` | Backup progress |
| GET | `/api/realtime/restore/{id}/progress` | Restore progress |

---

## Troubleshooting

### Common Issues

#### Backup fails with "Out of disk space"

```bash
# Check disk space
df -h /var/backups

# Clean up old backups
php artisan backup:cleanup --force

# Or expand storage
```

#### Backup takes too long

```bash
# Check table sizes
mysql -e "SELECT table_name, ROUND(data_length/1024/1024, 2) AS 'Size (MB)' 
          FROM information_schema.tables 
          WHERE table_schema='flexcloud_potiskum' 
          ORDER BY data_length DESC"

# Consider excluding large tables
php artisan backup:tenant potiskum --exclude=audit_logs,sms_logs
```

#### Restore fails with "MySQL has gone away"

```bash
# Increase MySQL timeout
mysql -e "SET GLOBAL max_allowed_packet=1073741824"
mysql -e "SET GLOBAL wait_timeout=28800"
```

#### "Permission denied" when writing backup

```bash
# Fix permissions
sudo chown -R www-data:www-data /var/backups/flexcloud
sudo chmod -R 775 /var/backups/flexcloud
```

### Logs

```bash
# View backup logs
tail -f /var/log/flexcloud/backup.log

# View Laravel logs
tail -f /var/www/flexcloud/current/laravel-backend/storage/logs/laravel.log

# View MySQL logs
tail -f /var/log/mysql/error.log
```

### Support

For backup-related issues:
1. Check logs first
2. Run `php artisan backup:diagnose`
3. Contact support with backup ID and error message
