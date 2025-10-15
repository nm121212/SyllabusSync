#!/bin/bash

# SyllabusSync - Complete Application Startup Script
# This script sets up and runs the entire SyllabusSync application

set -e  # Exit on any error

echo "🚀 SyllabusSync - Complete Application Startup"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
print_status "Checking prerequisites..."

# Check Java
if ! command -v java &> /dev/null; then
    print_error "Java is not installed. Please install Java 17+ first."
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2 | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 17 ]; then
    print_error "Java 17+ is required. Current version: $JAVA_VERSION"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js 18+ is required. Current version: $NODE_VERSION"
    exit 1
fi

print_success "Prerequisites check passed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_status "Creating .env file from template..."
    cp env.example .env
    print_warning "Please edit .env file with your actual credentials before running the application"
    print_warning "Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GEMINI_API_KEY"
    echo ""
    read -p "Press Enter to continue after updating .env file, or Ctrl+C to exit..."
fi

# Kill any existing processes
print_status "Cleaning up any existing processes..."
pkill -f "spring-boot:run" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true
pkill -f "syllabussync" 2>/dev/null || true

# Load environment variables from .env file
if [ -f .env ]; then
    print_status "Loading environment variables from .env file..."
    export $(grep -v '^#' .env | xargs)
fi

# Start backend
print_status "Starting Spring Boot backend..."
cd backend

# Check if Maven wrapper exists and is executable
if [ -f "mvnw" ] && [ ! -x "mvnw" ]; then
    chmod +x mvnw
fi

# Start backend in background with environment variables
if [ -f "mvnw" ]; then
    print_status "Using Maven wrapper..."
    env $(grep -v '^#' ../.env | xargs) ./mvnw spring-boot:run > ../backend.log 2>&1 &
else
    print_status "Using system Maven..."
    env $(grep -v '^#' ../.env | xargs) mvn spring-boot:run > ../backend.log 2>&1 &
fi

BACKEND_PID=$!
print_success "Backend started with PID: $BACKEND_PID"

# Wait for backend to be ready
print_status "Waiting for backend to start (this may take 30-60 seconds)..."
BACKEND_READY=false
for i in {1..60}; do
    if curl -s http://localhost:8080/actuator/health > /dev/null 2>&1; then
        BACKEND_READY=true
        break
    fi
    echo -n "."
    sleep 1
done

if [ "$BACKEND_READY" = true ]; then
    print_success "Backend is ready!"
else
    print_warning "Backend may still be starting up..."
fi

# Start frontend
print_status "Starting React frontend..."
cd ../frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies (this may take a few minutes)..."
    npm install
fi

# Start frontend in background with environment variables
env $(grep -v '^#' ../.env | xargs) npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
print_success "Frontend started with PID: $FRONTEND_PID"

# Wait for frontend to be ready
print_status "Waiting for frontend to start..."
sleep 10

echo ""
echo "🎉 SyllabusSync is now running!"
echo "==============================="
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "📊 Backend API: http://localhost:8080/api"
echo "🗄️  H2 Database Console: http://localhost:8080/h2-console"
echo "📚 Health Check: http://localhost:8080/actuator/health"
echo ""
echo "📋 Logs:"
echo "   Backend: tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo ""
echo "🛑 To stop all services: Press Ctrl+C"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    print_status "Stopping services..."
    
    # Kill backend
    if kill $BACKEND_PID 2>/dev/null; then
        print_success "Backend stopped"
    fi
    
    # Kill frontend
    if kill $FRONTEND_PID 2>/dev/null; then
        print_success "Frontend stopped"
    fi
    
    # Clean up any remaining processes
    pkill -f "spring-boot:run" 2>/dev/null || true
    pkill -f "react-scripts start" 2>/dev/null || true
    
    print_success "All services stopped"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Keep script running and show status
while true; do
    # Check if processes are still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        print_error "Backend process died unexpectedly"
        cleanup
    fi
    
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        print_error "Frontend process died unexpectedly"
        cleanup
    fi
    
    sleep 5
done
