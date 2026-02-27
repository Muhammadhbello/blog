#!/bin/bash

# FlexCloud Apache Setup Script
# ==============================
# This script configures Apache for FlexCloud multi-tenant application
# with wildcard subdomain support

set -e

echo "=========================================="
echo "FlexCloud Apache Configuration Setup"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# ==========================================
# 1. Install Apache if not present
# ==========================================
echo -e "\n${YELLOW}Step 1: Checking Apache installation...${NC}"
if ! command -v apache2 &> /dev/null; then
    echo "Installing Apache2..."
    apt-get update
    apt-get install -y apache2
else
    echo -e "${GREEN}Apache2 is already installed${NC}"
fi

# ==========================================
# 2. Enable required modules
# ==========================================
echo -e "\n${YELLOW}Step 2: Enabling required Apache modules...${NC}"
MODULES="proxy proxy_http proxy_wstunnel rewrite ssl headers"

for module in $MODULES; do
    if ! apache2ctl -M 2>/dev/null | grep -q "${module}_module"; then
        echo "Enabling module: $module"
        a2enmod $module
    else
        echo -e "${GREEN}Module $module is already enabled${NC}"
    fi
done

# ==========================================
# 3. Configure hosts file for local development
# ==========================================
echo -e "\n${YELLOW}Step 3: Configuring /etc/hosts...${NC}"

HOSTS_ENTRIES=(
    "127.0.0.1 flexcloud.test"
    "127.0.0.1 potiskum.flexcloud.test"
    "127.0.0.1 damaturu.flexcloud.test"
    "127.0.0.1 nguru.flexcloud.test"
    "127.0.0.1 geidam.flexcloud.test"
    "127.0.0.1 bade.flexcloud.test"
    "127.0.0.1 admin.flexcloud.test"
)

for entry in "${HOSTS_ENTRIES[@]}"; do
    if ! grep -q "$entry" /etc/hosts; then
        echo "$entry" >> /etc/hosts
        echo "Added: $entry"
    else
        echo -e "${GREEN}Already exists: $entry${NC}"
    fi
done

# ==========================================
# 4. Copy Apache configuration
# ==========================================
echo -e "\n${YELLOW}Step 4: Installing FlexCloud Apache config...${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_SOURCE="${SCRIPT_DIR}/flexcloud.conf"
CONFIG_DEST="/etc/apache2/sites-available/flexcloud.conf"

if [ -f "$CONFIG_SOURCE" ]; then
    cp "$CONFIG_SOURCE" "$CONFIG_DEST"
    echo "Copied configuration to $CONFIG_DEST"
else
    echo -e "${RED}Config file not found at $CONFIG_SOURCE${NC}"
    echo "Please copy the configuration manually"
fi

# ==========================================
# 5. Enable the site
# ==========================================
echo -e "\n${YELLOW}Step 5: Enabling FlexCloud site...${NC}"

if [ -f "$CONFIG_DEST" ]; then
    a2ensite flexcloud.conf
    echo -e "${GREEN}FlexCloud site enabled${NC}"
else
    echo -e "${RED}Cannot enable site - config file missing${NC}"
fi

# ==========================================
# 6. Test Apache configuration
# ==========================================
echo -e "\n${YELLOW}Step 6: Testing Apache configuration...${NC}"
if apache2ctl configtest; then
    echo -e "${GREEN}Apache configuration is valid${NC}"
else
    echo -e "${RED}Apache configuration has errors!${NC}"
    exit 1
fi

# ==========================================
# 7. Restart Apache
# ==========================================
echo -e "\n${YELLOW}Step 7: Restarting Apache...${NC}"
systemctl restart apache2
echo -e "${GREEN}Apache restarted successfully${NC}"

# ==========================================
# 8. Display status
# ==========================================
echo -e "\n=========================================="
echo -e "${GREEN}FlexCloud Apache Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Available URLs:"
echo "  - Platform Admin: http://admin.flexcloud.test"
echo "  - Potiskum LGA:   http://potiskum.flexcloud.test"
echo "  - Damaturu LGA:   http://damaturu.flexcloud.test"
echo "  - Nguru LGA:      http://nguru.flexcloud.test"
echo ""
echo "Make sure to start your backend services:"
echo "  - Laravel:   cd /path/to/laravel-backend && php artisan serve --port=8000"
echo "  - Next.js:   cd /path/to/nextjs-frontend && npm run dev"
echo ""
echo "Or use the start script: ./scripts/start-dev.sh"
