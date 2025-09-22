#!/bin/bash

# Test Environment Setup Script
# This script sets up the test environment for the Fulexo Platform

set -e

echo "🚀 Setting up test environment for Fulexo Platform..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Install dependencies
print_status "Installing dependencies..."
npm install
npm run install:all

# Create test environment file if it doesn't exist
if [ ! -f ".env.test" ]; then
    print_status "Creating test environment file..."
    cp compose/env-template .env.test
    print_warning "Please update .env.test with your test configuration"
fi

# Create development environment file if it doesn't exist
if [ ! -f ".env" ]; then
    print_status "Creating development environment file..."
    cp compose/env-template .env
    print_warning "Please update .env with your development configuration"
fi

# Check if Docker is available
if command -v docker &> /dev/null; then
    print_status "Docker is available, starting test services..."
    
    # Start test services
    if [ -f "docker-compose.test.yml" ]; then
        docker-compose -f docker-compose.test.yml up -d
        print_status "Test services started"
    else
        print_warning "docker-compose.test.yml not found, skipping Docker services"
    fi
else
    print_warning "Docker not available, skipping Docker services"
    print_warning "Some tests may fail without proper database and Redis setup"
fi

# Run type checking
print_status "Running type checking..."
npm run type-check

# Run linting
print_status "Running linting..."
npm run lint

# Run unit tests
print_status "Running unit tests..."
npm test

# Run E2E tests (if Docker services are available)
if command -v docker &> /dev/null && docker ps &> /dev/null; then
    print_status "Running E2E tests..."
    npm run test:e2e
else
    print_warning "Skipping E2E tests (Docker not available or not running)"
fi

# Generate test coverage report
print_status "Generating test coverage report..."
npm run test:coverage

print_status "✅ Test environment setup completed!"
print_status "📊 Test coverage report available in coverage/ directory"
print_status "🎯 You can now run tests with: npm test"
print_status "🌐 E2E tests can be run with: npm run test:e2e"