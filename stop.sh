#!/bin/bash

# SyllabusSync - Stop All Services Script

echo "🛑 Stopping SyllabusSync Services"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Stop Spring Boot backend
print_status "Stopping Spring Boot backend..."
pkill -f "spring-boot:run" 2>/dev/null && print_success "Backend stopped" || echo "No backend process found"

# Stop React frontend
print_status "Stopping React frontend..."
pkill -f "react-scripts start" 2>/dev/null && print_success "Frontend stopped" || echo "No frontend process found"

# Stop any other related processes
print_status "Stopping any remaining SyllabusSync processes..."
pkill -f "syllabussync" 2>/dev/null && print_success "Additional processes stopped" || echo "No additional processes found"

# Clean up log files (optional)
read -p "Do you want to clean up log files? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Cleaning up log files..."
    rm -f backend.log frontend.log 2>/dev/null
    print_success "Log files cleaned up"
fi

print_success "All SyllabusSync services have been stopped"
