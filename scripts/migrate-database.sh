#!/bin/bash

# Fulexo Platform - Database Migration Script
# This script runs database migrations and sets up RLS policies

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
print_status() { echo -e "${GREEN}[✓]${NC} $1"; }
print_error() { echo -e "${RED}[✗]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_info() { echo -e "${BLUE}[i]${NC} $1"; }

echo ""
echo "🗄️  Fulexo Platform - Database Migration"
echo "========================================"
echo ""

# Check if running in Docker
if [ -f /.dockerenv ]; then
    print_info "Running inside Docker container"
    API_DIR="/app"
else
    print_info "Running on host system"
    API_DIR="/opt/fulexo/apps/api"
fi

# Check if API directory exists
if [ ! -d "$API_DIR" ]; then
    print_error "API directory not found: $API_DIR"
    exit 1
fi

cd "$API_DIR"

# Check if .env file exists
if [ ! -f ".env" ] && [ ! -f "../.env" ]; then
    print_warning "No .env file found, using environment variables"
fi

# 1. Generate Prisma client
print_status "1/4 - Generating Prisma client..."
if command -v npx &> /dev/null; then
    npx prisma generate
else
    print_error "npx not found. Please install Node.js and npm"
    exit 1
fi

# 2. Run database migrations
print_status "2/4 - Running database migrations..."
if [ -f "prisma/migrations" ]; then
    npx prisma migrate deploy
else
    print_warning "No migrations found, pushing schema..."
    npx prisma db push
fi

# 3. Apply RLS policies
print_status "3/4 - Applying Row Level Security policies..."
if [ -f "prisma/rls.sql" ]; then
    # Get database URL from environment
    if [ -n "${DATABASE_URL:-}" ]; then
        psql "$DATABASE_URL" -f prisma/rls.sql
    else
        print_warning "DATABASE_URL not set, skipping RLS policies"
    fi
else
    print_warning "RLS policies file not found: prisma/rls.sql"
fi

# 4. Seed database
print_status "4/4 - Seeding database..."
if [ -f "prisma/seed.ts" ]; then
    npx ts-node prisma/seed.ts
else
    print_warning "Seed file not found: prisma/seed.ts"
fi

echo ""
print_status "Database migration completed successfully!"
echo ""
print_info "Next steps:"
echo "1. Start the application services"
echo "2. Check health endpoints"
echo "3. Verify RLS policies are working"
echo ""