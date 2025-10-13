#!/bin/bash

# SyllabusSync Development Startup Script
# This script starts the application using free services

echo "🚀 Starting SyllabusSync Development Environment"
echo "================================================"

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "❌ Java is not installed. Please install Java 17+ first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Java and Node.js are installed"

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your Google OAuth credentials"
fi

# Start backend
echo "🔧 Starting Spring Boot backend..."
cd backend

# Use Maven if available, otherwise use Gradle wrapper
if command -v mvn &> /dev/null; then
    echo "Using Maven..."
    mvn spring-boot:run &
elif [ -f "mvnw" ]; then
    echo "Using Maven wrapper..."
    ./mvnw spring-boot:run &
else
    echo "❌ No Maven installation found. Please install Maven or use the Maven wrapper."
    exit 1
fi

BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 10

# Start frontend
echo "⚛️  Starting React frontend..."
cd ../frontend

if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

npm start &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo ""
echo "🎉 SyllabusSync is starting up!"
echo "================================"
echo "📊 Backend: http://localhost:8080"
echo "🌐 Frontend: http://localhost:3000"
echo "🗄️  H2 Console: http://localhost:8080/h2-console"
echo "📚 API Docs: http://localhost:8080/swagger-ui.html"
echo ""
echo "Press Ctrl+C to stop all services"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait
