#!/bin/bash

echo "🚀 Starting SyllabusSync Full Application"
echo "========================================"

# Kill any existing processes
pkill -f syllabussync-1.0.0.jar 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true

# Start backend
echo "📊 Starting backend..."
cd backend
java -jar target/syllabussync-1.0.0.jar > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend
sleep 8

# Start frontend
echo "⚛️ Starting frontend..."
cd ../frontend
npm start > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

# Wait for frontend
sleep 5

echo ""
echo "🎉 SyllabusSync is running!"
echo "=========================="
echo "🌐 Frontend: http://localhost:3000"
echo "📊 Backend: http://localhost:8080"
echo "🗄️ H2 Console: http://localhost:8080/h2-console"
echo ""
echo "Press Ctrl+C to stop all services"

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    pkill -f syllabussync-1.0.0.jar 2>/dev/null || true
    pkill -f "react-scripts start" 2>/dev/null || true
    echo "✅ Services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep script running
while true; do
    sleep 1
done