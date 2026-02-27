#!/bin/bash

# FlexCloud Development Start Script
# ===================================
# Starts all services needed for local development

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT"
FRONTEND_DIR="${PROJECT_ROOT}/../nextjs-frontend"

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════╗"
echo "║        FlexCloud Development Server           ║"
echo "╚═══════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# ==========================================
# Pre-flight checks
# ==========================================
echo -e "${YELLOW}Running pre-flight checks...${NC}"

# Check PHP
if ! command -v php &> /dev/null; then
    echo "PHP is not installed. Please install PHP 8.2+"
    exit 1
fi
echo "✓ PHP $(php -v | head -n 1 | cut -d' ' -f2)"

# Check Node
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js 18+"
    exit 1
fi
echo "✓ Node.js $(node -v)"

# Check npm/yarn
if command -v yarn &> /dev/null; then
    PKG_MANAGER="yarn"
else
    PKG_MANAGER="npm"
fi
echo "✓ Using $PKG_MANAGER"

# Check Composer
if ! command -v composer &> /dev/null; then
    echo "Composer is not installed. Please install Composer"
    exit 1
fi
echo "✓ Composer $(composer -V | cut -d' ' -f3)"

# ==========================================
# Environment setup
# ==========================================
echo -e "\n${YELLOW}Checking environment files...${NC}"

if [ ! -f "$BACKEND_DIR/.env" ]; then
    if [ -f "$BACKEND_DIR/.env.example" ]; then
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
        echo "Created .env from .env.example - Please configure it"
    fi
fi

# ==========================================
# Kill existing processes on ports
# ==========================================
echo -e "\n${YELLOW}Checking for existing processes...${NC}"

if check_port 8000; then
    echo "Port 8000 is in use. Killing existing process..."
    kill $(lsof -t -i:8000) 2>/dev/null || true
    sleep 1
fi

if check_port 3000; then
    echo "Port 3000 is in use. Killing existing process..."
    kill $(lsof -t -i:3000) 2>/dev/null || true
    sleep 1
fi

# ==========================================
# Start Laravel Backend
# ==========================================
echo -e "\n${YELLOW}Starting Laravel backend on port 8000...${NC}"
cd "$BACKEND_DIR"

# Run migrations if needed
# php artisan migrate --force 2>/dev/null || true

# Start Laravel in background
php artisan serve --host=0.0.0.0 --port=8000 > /tmp/laravel.log 2>&1 &
LARAVEL_PID=$!
echo "Laravel started with PID: $LARAVEL_PID"

# Wait for Laravel to be ready
sleep 3
if check_port 8000; then
    echo -e "${GREEN}✓ Laravel backend is running on http://localhost:8000${NC}"
else
    echo "Warning: Laravel may not have started correctly. Check /tmp/laravel.log"
fi

# ==========================================
# Start Next.js Frontend
# ==========================================
echo -e "\n${YELLOW}Starting Next.js frontend on port 3000...${NC}"
cd "$FRONTEND_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    $PKG_MANAGER install
fi

# Start Next.js in background
$PKG_MANAGER run dev > /tmp/nextjs.log 2>&1 &
NEXTJS_PID=$!
echo "Next.js started with PID: $NEXTJS_PID"

# Wait for Next.js to be ready
sleep 5
if check_port 3000; then
    echo -e "${GREEN}✓ Next.js frontend is running on http://localhost:3000${NC}"
else
    echo "Warning: Next.js may not have started correctly. Check /tmp/nextjs.log"
fi

# ==========================================
# Display status
# ==========================================
echo -e "\n${CYAN}"
echo "╔═══════════════════════════════════════════════╗"
echo "║          FlexCloud is Ready!                  ║"
echo "╚═══════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}Services Running:${NC}"
echo "  • Laravel API:     http://localhost:8000/api"
echo "  • Next.js App:     http://localhost:3000"
echo ""
echo -e "${GREEN}Multi-Tenant URLs (requires Apache setup):${NC}"
echo "  • Platform Admin:  http://admin.flexcloud.test"
echo "  • Potiskum LGA:    http://potiskum.flexcloud.test"
echo "  • Damaturu LGA:    http://damaturu.flexcloud.test"
echo ""
echo -e "${YELLOW}Process IDs:${NC}"
echo "  • Laravel:  $LARAVEL_PID"
echo "  • Next.js:  $NEXTJS_PID"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo "  • Laravel:  tail -f /tmp/laravel.log"
echo "  • Next.js:  tail -f /tmp/nextjs.log"
echo ""
echo "Press Ctrl+C to stop all services"

# ==========================================
# Wait and cleanup on exit
# ==========================================
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    kill $LARAVEL_PID 2>/dev/null || true
    kill $NEXTJS_PID 2>/dev/null || true
    echo -e "${GREEN}Services stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running
while true; do
    sleep 1
done
