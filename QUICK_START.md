# Quick Start Guide

**Last Updated:** October 13, 2025  
**Estimated Setup Time:** 15 minutes

Get Fulexo up and running in minutes with this quick start guide.

## ⚡ TL;DR

```bash
# 1. Install dependencies
npm install && npm run install:all

# 2. Setup environment
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local

# 3. Start services
docker compose -f compose/docker-compose.yml up -d

# 4. Setup database
cd apps/api && npm run prisma:migrate:dev && npm run prisma:seed

# 5. Start development
npm run dev:all
```

**Access:** http://localhost:3001  
**Default Login:** admin@example.com / demo123

---

## 📋 Detailed Steps

### Step 1: Prerequisites Check

```bash
# Verify you have the required tools
node --version    # Should show v20.x or higher
npm --version     # Should show v10.x or higher
docker --version  # Should show v24.x or higher

# If any are missing, install them first
```

### Step 2: Clone and Install

```bash
# Clone the repository
git clone https://github.com/fulexo/panel.git
cd panel

# Install all dependencies (this may take a few minutes)
npm install
npm run install:all

# Verify installation
ls -la apps/*/node_modules
```

### Step 3: Environment Configuration

```bash
# Copy environment templates
cp .env.example .env
cp apps/web/.env.local.example apps/web/.env.local

# Edit .env file (minimal required changes):
# 1. Set JWT_SECRET to a random 64+ character string
# 2. Set ENCRYPTION_KEY to a random 32 character string
# 3. Keep other defaults for local development

# Generate random secrets (Linux/Mac):
openssl rand -base64 64  # For JWT_SECRET
openssl rand -base64 32  # For ENCRYPTION_KEY
```

**Example .env for local development:**
```env
NODE_ENV=development
DATABASE_URL="postgresql://fulexo_user:fulexo_password_123@localhost:5433/fulexo"
REDIS_URL="redis://localhost:6380/0"
JWT_SECRET="your-generated-64-char-secret-here"
ENCRYPTION_KEY="your-generated-32-char-key-here"
NEXT_PUBLIC_API_BASE="http://localhost:3000/api"
```

### Step 4: Start Docker Services

```bash
# Start PostgreSQL, Redis, MinIO, and monitoring tools
docker compose -f compose/docker-compose.yml up -d

# Wait for services to be ready (about 30 seconds)
sleep 30

# Verify services are running
docker compose ps

# Expected output: All services should show "Up" status
```

### Step 5: Initialize Database

```bash
# Generate Prisma client
cd apps/api
npm run prisma:generate

# Run database migrations
npm run prisma:migrate:dev

# Seed with demo data
npm run prisma:seed

# Return to project root
cd ../..
```

**Demo Users Created:**
- **Admin:** admin@example.com / demo123
- **Customer:** customer@example.com / demo123

### Step 6: Start Development Servers

```bash
# Start all apps (API, Web, Worker)
npm run dev:all

# OR start individually in separate terminals:
# Terminal 1: cd apps/api && npm run dev
# Terminal 2: cd apps/web && npm run dev
# Terminal 3: cd apps/worker && npm run dev
```

Wait for the startup messages:
```
✓ API ready on http://localhost:3000
✓ Web ready on http://localhost:3001  
✓ Worker ready on http://localhost:3002
```

### Step 7: Access the Platform

Open your browser and navigate to:

🌐 **Main Application:** http://localhost:3001

**Login with:**
- Email: `admin@example.com`
- Password: `demo123`

**Other Services:**
- 📊 **API Documentation (Swagger):** http://localhost:3000/docs
- 📈 **Monitoring (Grafana):** http://localhost:3001/grafana (admin/admin)
- 📦 **Karrio Dashboard:** http://localhost:5001
- 🔍 **Prometheus:** http://localhost:9090

---

## ✅ Verification

### Test the Setup

1. **Login to the panel** at http://localhost:3001
2. **Navigate to Dashboard** - Should show overview widgets
3. **Visit Stores page** - Should be empty (add your first store)
4. **Check API health** - http://localhost:3000/health should return healthy status

### Quick Health Check

```bash
# Run automated health check
./scripts/health-check.sh

# Expected output:
# ✅ API is healthy
# ✅ Web is responding
# ✅ Worker is healthy
# ✅ Database is connected
# ✅ Redis is connected
```

---

## 🎯 Next Steps

### Add Your First WooCommerce Store

1. Navigate to **Stores** page
2. Click **Add Store**
3. Enter:
   - Store name
   - WooCommerce URL (e.g., https://mystore.com)
   - Consumer Key (from WooCommerce > Settings > Advanced > REST API)
   - Consumer Secret
4. Click **Test Connection** to verify
5. Click **Save** to add the store
6. Click **Sync** to import products and orders

### Explore the Platform

- 📦 **Products** - View and manage inventory
- 🛒 **Orders** - Process customer orders
- 🚚 **Shipping** - Configure shipping zones and rates
- 📊 **Reports** - View analytics and insights
- 👥 **Customers** - Manage customer accounts
- ⚙️ **Settings** - Configure platform settings

### Set Up Shipping (Optional)

1. Configure Karrio integration (see [KARRIO_INTEGRATION_BLUEPRINT.md](./KARRIO_INTEGRATION_BLUEPRINT.md))
2. Add carrier credentials in Karrio dashboard
3. Test rate fetching from Orders page

---

## 🐛 Common Issues

### "Cannot connect to database"

```bash
# Check if PostgreSQL is running
docker compose ps postgres

# Check connection string
grep DATABASE_URL apps/api/.env

# Restart PostgreSQL
docker compose restart postgres
```

### "Port already in use"

```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or change ports in docker-compose.yml
```

### "Module not found"

```bash
# Reinstall dependencies
rm -rf node_modules apps/*/node_modules
npm install
npm run install:all
```

### "Prisma Client not generated"

```bash
cd apps/api
npm run prisma:generate
cd ../..
```

---

## 🛑 Stopping the Platform

```bash
# Stop development servers
# Press Ctrl+C in each terminal running npm run dev

# Stop Docker services
docker compose -f compose/docker-compose.yml down

# Stop and remove all data (DESTRUCTIVE - development only)
docker compose -f compose/docker-compose.yml down -v
```

---

## 📚 Learn More

- **Full Documentation:** [README.md](./README.md)
- **Development Guide:** [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Reference:** [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Deployment:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Troubleshooting:** [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 💬 Need Help?

- 📖 Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- 🐛 Create an issue on GitHub
- 💬 Ask in community channels

**Welcome to Fulexo! 🎉**
