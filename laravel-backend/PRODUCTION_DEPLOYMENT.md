# FlexCloud Production Deployment Guide

## Table of Contents
1. [Server Requirements](#server-requirements)
2. [Server Setup](#server-setup)
3. [SSL Certificate with Let's Encrypt](#ssl-certificate-with-lets-encrypt)
4. [Application Deployment](#application-deployment)
5. [Database Setup](#database-setup)
6. [Queue Workers](#queue-workers)
7. [Caching with Redis](#caching-with-redis)
8. [Real-time with Pusher](#real-time-with-pusher)
9. [Monitoring & Logging](#monitoring--logging)
10. [Backup Strategy](#backup-strategy)
11. [Security Hardening](#security-hardening)
12. [Scaling Considerations](#scaling-considerations)

---

## Server Requirements

### Minimum Specifications
- **CPU**: 2 vCPUs
- **RAM**: 4GB
- **Storage**: 50GB SSD
- **OS**: Ubuntu 22.04 LTS

### Recommended Specifications (Production)
- **CPU**: 4+ vCPUs
- **RAM**: 8GB+
- **Storage**: 100GB+ SSD
- **OS**: Ubuntu 22.04 LTS

### Software Requirements
- PHP 8.2+ with extensions
- MySQL 8.0+
- Nginx 1.18+
- Node.js 18+ (for build)
- Redis 6+
- Supervisor
- Certbot (Let's Encrypt)

---

## Server Setup

### 1. Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git unzip software-properties-common

# Add PHP repository
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# Install PHP 8.2 and extensions
sudo apt install -y php8.2-fpm php8.2-cli php8.2-mysql php8.2-pgsql \
    php8.2-sqlite3 php8.2-gd php8.2-curl php8.2-mbstring php8.2-xml \
    php8.2-zip php8.2-bcmath php8.2-intl php8.2-readline php8.2-redis

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Install MySQL
sudo apt install -y mysql-server
sudo mysql_secure_installation

# Install Nginx
sudo apt install -y nginx

# Install Redis
sudo apt install -y redis-server

# Install Supervisor
sudo apt install -y supervisor

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Create Application User

```bash
# Create deploy user
sudo adduser deploy
sudo usermod -aG www-data deploy
sudo usermod -aG sudo deploy

# Setup SSH keys for deploy user
sudo mkdir -p /home/deploy/.ssh
sudo cp ~/.ssh/authorized_keys /home/deploy/.ssh/
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

### 3. Create Directory Structure

```bash
# Create application directories
sudo mkdir -p /var/www/flexcloud
sudo mkdir -p /var/www/flexcloud/releases
sudo mkdir -p /var/www/flexcloud/shared
sudo mkdir -p /var/www/flexcloud/shared/storage
sudo mkdir -p /var/log/flexcloud

# Set ownership
sudo chown -R deploy:www-data /var/www/flexcloud
sudo chown -R deploy:www-data /var/log/flexcloud
sudo chmod -R 775 /var/www/flexcloud
```

---

## SSL Certificate with Let's Encrypt

### 1. DNS Configuration

Before obtaining SSL certificates, configure your DNS:

```
# A Records
flexcloud.ng          A    YOUR_SERVER_IP
*.flexcloud.ng        A    YOUR_SERVER_IP

# Or use a CNAME for wildcard
*.flexcloud.ng        CNAME  flexcloud.ng
```

### 2. Obtain Wildcard SSL Certificate

```bash
# Install Certbot with DNS plugin (for wildcard)
sudo apt install -y python3-certbot-dns-cloudflare

# Create Cloudflare credentials file (if using Cloudflare)
sudo mkdir -p /root/.secrets
sudo nano /root/.secrets/cloudflare.ini
```

Add to cloudflare.ini:
```ini
dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN
```

```bash
# Set permissions
sudo chmod 600 /root/.secrets/cloudflare.ini

# Obtain wildcard certificate
sudo certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /root/.secrets/cloudflare.ini \
    -d flexcloud.ng \
    -d "*.flexcloud.ng" \
    --preferred-challenges dns-01
```

### 3. Alternative: Manual DNS Challenge

```bash
# If not using Cloudflare, use manual DNS challenge
sudo certbot certonly --manual \
    --preferred-challenges dns \
    -d flexcloud.ng \
    -d "*.flexcloud.ng"
```

Follow the prompts to add TXT records to your DNS.

### 4. Auto-Renewal Setup

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot auto-renewal is already configured via systemd timer
sudo systemctl status certbot.timer
```

### 5. Certificate Locations

After successful issuance:
- Certificate: `/etc/letsencrypt/live/flexcloud.ng/fullchain.pem`
- Private Key: `/etc/letsencrypt/live/flexcloud.ng/privkey.pem`

---

## Application Deployment

### 1. Clone Repository

```bash
cd /var/www/flexcloud
sudo -u deploy git clone https://github.com/your-org/flexcloud.git releases/initial
ln -sfn /var/www/flexcloud/releases/initial /var/www/flexcloud/current
```

### 2. Laravel Backend Setup

```bash
cd /var/www/flexcloud/current/laravel-backend

# Install dependencies
sudo -u deploy composer install --no-dev --optimize-autoloader

# Copy environment file
sudo -u deploy cp .env.example .env

# Generate application key
sudo -u deploy php artisan key:generate

# Link storage
sudo -u deploy php artisan storage:link

# Set permissions
sudo chown -R deploy:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

### 3. Production Environment Variables

Edit `/var/www/flexcloud/current/laravel-backend/.env`:

```env
APP_NAME=FlexCloud
APP_ENV=production
APP_DEBUG=false
APP_URL=https://flexcloud.ng

LOG_CHANNEL=daily
LOG_LEVEL=error

# Platform Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=flexcloud_platform
DB_USERNAME=flexcloud_user
DB_PASSWORD=STRONG_PASSWORD_HERE

# Tenant Database Prefix
TENANT_DB_PREFIX=flexcloud_

# Cache & Session
CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

# Pusher (Real-time)
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=your_app_id
PUSHER_APP_KEY=your_app_key
PUSHER_APP_SECRET=your_app_secret
PUSHER_APP_CLUSTER=eu

# Mail
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=postmaster@flexcloud.ng
MAIL_PASSWORD=your_mail_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@flexcloud.ng
MAIL_FROM_NAME="FlexCloud"
```

### 4. Next.js Frontend Build

```bash
cd /var/www/flexcloud/current/nextjs-frontend

# Install dependencies
sudo -u deploy npm ci

# Create production env
sudo -u deploy nano .env.production
```

Add to `.env.production`:
```env
NEXT_PUBLIC_API_URL=https://flexcloud.ng/api
NEXT_PUBLIC_APP_URL=https://flexcloud.ng
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=eu
```

```bash
# Build for production
sudo -u deploy npm run build

# The build output will be in .next directory
```

### 5. Run Migrations

```bash
cd /var/www/flexcloud/current/laravel-backend

# Run platform migrations
sudo -u deploy php artisan migrate --path=database/migrations/platform --force

# Seed initial data
sudo -u deploy php artisan db:seed --class=PlatformSeeder --force

# Clear and cache config
sudo -u deploy php artisan config:cache
sudo -u deploy php artisan route:cache
sudo -u deploy php artisan view:cache
```

---

## Nginx Production Configuration

Create `/etc/nginx/sites-available/flexcloud`:

```nginx
# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

# Upstream servers
upstream laravel_backend {
    server unix:/var/run/php/php8.2-fpm.sock;
    keepalive 32;
}

upstream nextjs_frontend {
    server 127.0.0.1:3000;
    keepalive 32;
}

# HTTP - Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name flexcloud.ng *.flexcloud.ng;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS - Main Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    server_name flexcloud.ng *.flexcloud.ng;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/flexcloud.ng/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/flexcloud.ng/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    
    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Root & Logging
    root /var/www/flexcloud/current/laravel-backend/public;
    
    access_log /var/log/nginx/flexcloud-access.log;
    error_log /var/log/nginx/flexcloud-error.log;
    
    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;
    
    # Client body size (for file uploads)
    client_max_body_size 100M;
    
    # ==========================================
    # API Routes - PHP-FPM
    # ==========================================
    location /api {
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
        
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    location /sanctum {
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    # Login rate limiting
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        try_files $uri $uri/ /index.php?$query_string;
    }
    
    # PHP-FPM handling
    location ~ \.php$ {
        fastcgi_pass laravel_backend;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
        
        # Timeouts
        fastcgi_connect_timeout 60s;
        fastcgi_send_timeout 60s;
        fastcgi_read_timeout 60s;
    }
    
    # Storage files
    location /storage {
        alias /var/www/flexcloud/current/laravel-backend/storage/app/public;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # ==========================================
    # Next.js Static Assets
    # ==========================================
    location /_next/static {
        proxy_pass http://nextjs_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        
        # Cache static assets
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /_next {
        proxy_pass http://nextjs_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # ==========================================
    # Default - Next.js
    # ==========================================
    location / {
        proxy_pass http://nextjs_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Original-Host $host;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Block sensitive files
    location ~ /\.(?!well-known) {
        deny all;
    }
    
    location ~ /\.env {
        deny all;
    }
}
```

Enable the site:
```bash
sudo ln -sf /etc/nginx/sites-available/flexcloud /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## Queue Workers

### Supervisor Configuration

Create `/etc/supervisor/conf.d/flexcloud-worker.conf`:

```ini
[program:flexcloud-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/flexcloud/current/laravel-backend/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=deploy
numprocs=4
redirect_stderr=true
stdout_logfile=/var/log/flexcloud/worker.log
stopwaitsecs=3600

[program:flexcloud-scheduler]
process_name=%(program_name)s
command=/bin/bash -c "while [ true ]; do php /var/www/flexcloud/current/laravel-backend/artisan schedule:run --verbose --no-interaction >> /var/log/flexcloud/scheduler.log 2>&1; sleep 60; done"
autostart=true
autorestart=true
user=deploy
redirect_stderr=true
stdout_logfile=/var/log/flexcloud/scheduler.log

[program:nextjs]
process_name=%(program_name)s
command=npm start
directory=/var/www/flexcloud/current/nextjs-frontend
autostart=true
autorestart=true
user=deploy
environment=NODE_ENV="production",PORT="3000"
redirect_stderr=true
stdout_logfile=/var/log/flexcloud/nextjs.log
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start all
```

---

## Database Setup

### Create Production Database

```bash
sudo mysql -u root -p
```

```sql
-- Create database user
CREATE USER 'flexcloud_user'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD';

-- Create platform database
CREATE DATABASE flexcloud_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON flexcloud_platform.* TO 'flexcloud_user'@'localhost';

-- Grant ability to create tenant databases
GRANT CREATE, ALTER, DROP ON *.* TO 'flexcloud_user'@'localhost';

FLUSH PRIVILEGES;
```

### Database Optimization

Add to `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
[mysqld]
# InnoDB settings
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# Query cache
query_cache_type = 1
query_cache_size = 64M

# Connections
max_connections = 200

# Slow query log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2
```

```bash
sudo systemctl restart mysql
```

---

## Caching with Redis

### Redis Configuration

Edit `/etc/redis/redis.conf`:

```conf
maxmemory 512mb
maxmemory-policy allkeys-lru
appendonly yes
```

```bash
sudo systemctl restart redis
```

---

## Real-time with Pusher

See the separate Pusher integration guide in the next section.

---

## Monitoring & Logging

### Log Rotation

Create `/etc/logrotate.d/flexcloud`:

```
/var/log/flexcloud/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 deploy www-data
    sharedscripts
    postrotate
        supervisorctl restart flexcloud-worker:*
    endscript
}
```

### Health Monitoring Script

Create `/var/www/flexcloud/scripts/health-check.sh`:

```bash
#!/bin/bash

# Check Nginx
if ! systemctl is-active --quiet nginx; then
    echo "CRITICAL: Nginx is down"
    systemctl restart nginx
fi

# Check PHP-FPM
if ! systemctl is-active --quiet php8.2-fpm; then
    echo "CRITICAL: PHP-FPM is down"
    systemctl restart php8.2-fpm
fi

# Check MySQL
if ! systemctl is-active --quiet mysql; then
    echo "CRITICAL: MySQL is down"
    systemctl restart mysql
fi

# Check Redis
if ! systemctl is-active --quiet redis; then
    echo "CRITICAL: Redis is down"
    systemctl restart redis
fi

# Check API endpoint
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://flexcloud.ng/api/health)
if [ "$HTTP_CODE" != "200" ]; then
    echo "WARNING: API returned $HTTP_CODE"
fi

echo "Health check completed at $(date)"
```

Add to crontab:
```bash
*/5 * * * * /var/www/flexcloud/scripts/health-check.sh >> /var/log/flexcloud/health.log 2>&1
```

---

## Backup Strategy

### Automated Backups

Create `/var/www/flexcloud/scripts/backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/flexcloud"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup platform database
mysqldump -u flexcloud_user -p'PASSWORD' flexcloud_platform | gzip > $BACKUP_DIR/platform_$DATE.sql.gz

# Backup all tenant databases
for db in $(mysql -u flexcloud_user -p'PASSWORD' -e "SHOW DATABASES LIKE 'flexcloud_%'" -s --skip-column-names); do
    mysqldump -u flexcloud_user -p'PASSWORD' $db | gzip > $BACKUP_DIR/${db}_$DATE.sql.gz
done

# Backup storage files
tar -czf $BACKUP_DIR/storage_$DATE.tar.gz /var/www/flexcloud/current/laravel-backend/storage/app

# Remove old backups
find $BACKUP_DIR -type f -mtime +$RETENTION_DAYS -delete

echo "Backup completed at $(date)"
```

Add to crontab:
```bash
0 2 * * * /var/www/flexcloud/scripts/backup.sh >> /var/log/flexcloud/backup.log 2>&1
```

---

## Security Hardening

### Firewall (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Fail2Ban

```bash
sudo apt install fail2ban

# Create jail for Nginx
sudo nano /etc/fail2ban/jail.local
```

```ini
[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https"]
logpath = /var/log/nginx/flexcloud-error.log
findtime = 600
maxretry = 10
bantime = 7200
```

```bash
sudo systemctl restart fail2ban
```

---

## Deployment Checklist

- [ ] Server provisioned with correct specs
- [ ] All software installed (PHP, MySQL, Nginx, Redis, Node.js)
- [ ] DNS configured with A records
- [ ] SSL certificates obtained from Let's Encrypt
- [ ] Application code deployed
- [ ] Environment variables configured
- [ ] Database created and migrated
- [ ] Supervisor workers running
- [ ] Nginx configured and tested
- [ ] Redis running
- [ ] Pusher credentials configured
- [ ] Firewall enabled
- [ ] Fail2Ban configured
- [ ] Backups scheduled
- [ ] Health monitoring enabled
- [ ] Log rotation configured

---

## Troubleshooting

### Common Issues

**502 Bad Gateway**
```bash
# Check PHP-FPM
sudo systemctl status php8.2-fpm
sudo tail -f /var/log/php8.2-fpm.log
```

**SSL Certificate Issues**
```bash
# Renew certificates
sudo certbot renew
sudo systemctl reload nginx
```

**Queue Not Processing**
```bash
sudo supervisorctl status
sudo supervisorctl restart flexcloud-worker:*
```

**Database Connection Refused**
```bash
# Check MySQL
sudo systemctl status mysql
sudo tail -f /var/log/mysql/error.log
```
