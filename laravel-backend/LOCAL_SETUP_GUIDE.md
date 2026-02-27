# FlexCloud Local Development Setup Guide

## Prerequisites

- PHP 8.2+ with extensions: mbstring, xml, curl, mysql, zip
- Composer 2.x
- Node.js 18+ with npm/yarn
- MySQL 8.0+
- Apache 2.4+ or Nginx 1.18+

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Backend
cd laravel-backend
composer install
cp .env.example .env
php artisan key:generate

# Frontend
cd ../nextjs-frontend
yarn install
```

### 2. Configure Environment

Edit `laravel-backend/.env`:

```env
APP_NAME=FlexCloud
APP_ENV=local
APP_DEBUG=true
APP_URL=http://flexcloud.test

# Platform Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=flexcloud_platform
DB_USERNAME=root
DB_PASSWORD=your_password

# Tenant Database Prefix
TENANT_DB_PREFIX=flexcloud_
```

Edit `nextjs-frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://flexcloud.test/api
NEXT_PUBLIC_APP_URL=http://flexcloud.test
```

### 3. Setup Database

```bash
# Create platform database
mysql -u root -p -e "CREATE DATABASE flexcloud_platform;"

# Run migrations
cd laravel-backend
php artisan migrate --path=database/migrations/platform
php artisan db:seed --class=PlatformSeeder
```

### 4. Configure Web Server

#### Option A: Apache (Recommended for Windows/XAMPP)

```bash
# Copy Apache config
sudo cp config/apache/flexcloud.conf /etc/apache2/sites-available/

# Enable modules and site
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite headers
sudo a2ensite flexcloud.conf
sudo systemctl restart apache2

# Or use the setup script
sudo bash config/apache/setup-apache.sh
```

#### Option B: Nginx (Recommended for Linux/macOS)

```bash
# Copy Nginx config
sudo cp config/nginx/flexcloud.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/flexcloud.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Configure Local DNS

Add to `/etc/hosts` (Linux/macOS) or `C:\Windows\System32\drivers\etc\hosts` (Windows):

```
127.0.0.1   flexcloud.test
127.0.0.1   admin.flexcloud.test
127.0.0.1   potiskum.flexcloud.test
127.0.0.1   damaturu.flexcloud.test
127.0.0.1   nguru.flexcloud.test
```

### 6. Start Development Servers

```bash
# Option 1: Use the start script
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh

# Option 2: Manual start (in separate terminals)
# Terminal 1 - Laravel
cd laravel-backend
php artisan serve --host=0.0.0.0 --port=8000

# Terminal 2 - Next.js
cd nextjs-frontend
yarn dev
```

### 7. Access the Application

- **Platform Admin**: http://admin.flexcloud.test
- **Tenant Portal**: http://potiskum.flexcloud.test
- **API Docs**: http://flexcloud.test/api

## Creating a New Tenant

```bash
php artisan tenant:create "Potiskum LGA" potiskum chairman@potiskum.gov.ng
```

This will:
1. Create a new database `flexcloud_potiskum`
2. Run all tenant migrations
3. Create an admin user with the provided email
4. Display the temporary password

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Web Server (Apache/Nginx)              │
│                    *.flexcloud.test:80/443                  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  /api/*  │   │ /_next/* │   │   /*     │
        └──────────┘   └──────────┘   └──────────┘
              │               │               │
              ▼               └───────┬───────┘
        ┌──────────┐                  ▼
        │  Laravel │          ┌──────────────┐
        │   :8000  │          │   Next.js    │
        └──────────┘          │    :3000     │
              │               └──────────────┘
              ▼
        ┌──────────────────────────────────────┐
        │              MySQL 8.0               │
        ├──────────────────────────────────────┤
        │  flexcloud_platform  (Central DB)    │
        │  flexcloud_potiskum  (Tenant DB)     │
        │  flexcloud_damaturu  (Tenant DB)     │
        │  flexcloud_nguru     (Tenant DB)     │
        └──────────────────────────────────────┘
```

## Subdomain Resolution Flow

1. User visits `potiskum.flexcloud.test`
2. Web server proxies to Next.js/Laravel based on path
3. `SubdomainResolver` middleware extracts `potiskum` from host
4. Middleware looks up tenant in `flexcloud_platform.tenants`
5. Database connection switches to `flexcloud_potiskum`
6. All subsequent queries use tenant database

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Apache Errors
```bash
# Check Apache error log
tail -f /var/log/apache2/flexcloud-error.log

# Test Apache config
apache2ctl configtest
```

### Nginx Errors
```bash
# Check Nginx error log
tail -f /var/log/nginx/flexcloud-error.log

# Test Nginx config
nginx -t
```

### Database Connection Issues
```bash
# Test MySQL connection
mysql -u root -p -e "SHOW DATABASES;"

# Check Laravel DB connection
php artisan tinker
>>> DB::connection()->getPdo()
```

## Production Deployment

For production deployment, see `PRODUCTION_DEPLOYMENT.md` for:
- SSL certificate setup with Let's Encrypt
- Environment configuration
- Database optimization
- Caching with Redis
- Queue worker setup
- Monitoring and logging
