#!/bin/bash

echo "🚀 FlexCloud Startup Script"
echo "================================"

# Kill existing processes
echo "📋 Cleaning up existing processes..."
pkill -9 -f "php artisan serve" 2>/dev/null
pkill -9 -f "next dev" 2>/dev/null
sleep 2

# Start MySQL
echo "🗄️  Starting MySQL database..."
if command -v mysqld &> /dev/null; then
    mysqld_safe &
    sleep 3
    echo "✅ MySQL started"
else
    echo "⚠️  MySQL not found, attempting alternative startup..."
    /usr/sbin/mysqld --user=mysql --pid-file=/var/run/mysqld/mysqld.pid &
    sleep 3
fi

# Install any missing PHP extensions
echo "📦 Checking PHP extensions..."
apt-get install -y php8.2-mbstring php8.2-xml php8.2-mysql > /dev/null 2>&1

# Start Laravel backend
echo "⚙️  Starting Laravel backend on port 8002..."
cd /app/laravel-backend
php artisan config:clear > /dev/null 2>&1
php artisan route:clear > /dev/null 2>&1
php artisan serve --host=0.0.0.0 --port=8002 > /tmp/laravel.log 2>&1 &
LARAVEL_PID=$!
sleep 5

# Start Next.js frontend
echo "🎨 Starting Next.js frontend on port 3001..."
cd /app/nextjs-frontend
PORT=3001 npm run dev > /tmp/nextjs.log 2>&1 &
NEXTJS_PID=$!
sleep 8

echo ""
echo "================================"
echo "✅ Servers Started!"
echo "================================"
echo "Laravel PID: $LARAVEL_PID"
echo "Next.js PID: $NEXTJS_PID"
echo ""

# Test backend
echo "🧪 Testing backend API..."
BACKEND_TEST=$(curl -s -X POST http://localhost:8002/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"chairman@demo-lga.gov","password":"password123"}' | \
  python3 -c "import sys,json; data=json.load(sys.stdin); print('✅ Backend API: Working! User:', data['user']['name'])" 2>&1)

if [[ $BACKEND_TEST == *"Working"* ]]; then
    echo "$BACKEND_TEST"
else
    echo "❌ Backend not responding. Check logs: tail -f /tmp/laravel.log"
fi

# Test frontend
echo "🧪 Testing frontend..."
sleep 2
FRONTEND_TEST=$(curl -s http://localhost:3001 | grep -o "FlexCloud" | head -1)
if [ "$FRONTEND_TEST" == "FlexCloud" ]; then
    echo "✅ Frontend: Working!"
else
    echo "❌ Frontend not responding. Check logs: tail -f /tmp/nextjs.log"
fi

echo ""
echo "================================"
echo "📱 Access Points:"
echo "================================"
echo "🌐 Frontend:  http://localhost:3001"
echo "🔌 Backend:   http://localhost:8002/api"
echo ""
echo "👤 Login Credentials:"
echo "   Platform Admin: admin@flexcloud.com / password123"
echo "   Chairman:       chairman@demo-lga.gov / password123"
echo "   Treasurer:      treasurer@demo-lga.gov / password123"
echo ""
echo "📊 Logs:"
echo "   Backend:  tail -f /tmp/laravel.log"
echo "   Frontend: tail -f /tmp/nextjs.log"
echo "================================"

