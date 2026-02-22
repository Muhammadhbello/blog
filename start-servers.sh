#!/bin/bash

# Kill existing processes
pkill -9 -f "php artisan serve"
pkill -9 -f "next dev"

echo "Starting MySQL..."
service mariadb start
sleep 2

echo "Starting Laravel backend on port 8002..."
cd /app/laravel-backend
php artisan serve --host=0.0.0.0 --port=8002 > /tmp/laravel.log 2>&1 &
LARAVEL_PID=$!
sleep 4

echo "Starting Next.js frontend on port 3001..."
cd /app/nextjs-frontend
PORT=3001 npm run dev > /tmp/nextjs.log 2>&1 &
NEXTJS_PID=$!
sleep 6

echo "✅ Servers started!"
echo "Laravel PID: $LARAVEL_PID"
echo "Next.js PID: $NEXTJS_PID"
echo ""
echo "Testing backend..."
curl -s http://localhost:8002/api/login -X POST -H "Content-Type: application/json" -d '{"email":"chairman@demo-lga.gov","password":"password123"}' | python3 -c "import sys,json; data=json.load(sys.stdin); print('✅ Backend API working! User:', data['user']['name'])" 2>&1 || echo "❌ Backend not responding"

echo ""
echo "Testing frontend..."
curl -s http://localhost:3001 | grep -q "FlexCloud" && echo "✅ Frontend working!" || echo "❌ Frontend not responding"

echo ""
echo "Access the application at: http://localhost:3001"
