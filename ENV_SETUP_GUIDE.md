# Environment Setup Guide for E2E Testing

## Quick Start

To set up the environment for comprehensive E2E testing, follow these steps:

### Step 1: Create .env File

Create a `.env` file in the project root with the following content:

```bash
# Copy and paste this entire block into .env file

# =============================================================================
# NODE ENVIRONMENT
# =============================================================================
NODE_ENV=development
PORT=3000
WORKER_PORT=3002

# =============================================================================
# DATABASE CONFIGURATION (PostgreSQL)
# =============================================================================
POSTGRES_DB=fulexo_dev
POSTGRES_USER=fulexo
POSTGRES_PASSWORD=fulexo_dev_password_2024
DATABASE_URL=postgresql://fulexo:fulexo_dev_password_2024@localhost:5433/fulexo_dev

# =============================================================================
# REDIS/VALKEY CONFIGURATION
# =============================================================================
REDIS_URL=redis://localhost:6380

# =============================================================================
# SECURITY & ENCRYPTION
# =============================================================================
JWT_SECRET=fulexo_jwt_secret_key_for_development_testing_2024_change_in_production_minimum_64_chars
ENCRYPTION_KEY=fulexo_encryption_key_32chars!
MASTER_KEY_HEX=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
SHARE_TOKEN_SECRET=fulexo_share_token_secret_for_development_2024

# =============================================================================
# DOMAIN & URL CONFIGURATION
# =============================================================================
DOMAIN_API=localhost:3000
DOMAIN_APP=localhost:3001
NEXT_PUBLIC_API_BASE=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3001
WEB_URL=http://localhost:3001
SHARE_BASE_URL=http://localhost:3001/share

# =============================================================================
# S3/MINIO STORAGE CONFIGURATION
# =============================================================================
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=fulexo_minio_access_key
S3_SECRET_KEY=fulexo_minio_secret_key_2024
S3_BUCKET=fulexo-uploads
S3_REGION=us-east-1

# =============================================================================
# KARRIO SHIPPING GATEWAY CONFIGURATION
# =============================================================================
KARRIO_POSTGRES_DB=karrio
KARRIO_POSTGRES_USER=karrio
KARRIO_POSTGRES_PASSWORD=karrio_dev_password_2024
KARRIO_SECRET_KEY=karrio_secret_key_for_development_testing_2024_change_in_production
KARRIO_ALLOWED_HOSTS=localhost,127.0.0.1,karrio-server,karrio-dashboard
KARRIO_CORS_ALLOWED_ORIGINS=http://localhost:3001,http://localhost:5001,http://localhost:3000
KARRIO_ADMIN_URL=http://localhost:5001
KARRIO_API_URL=http://localhost:5002
ADMIN_EMAIL=admin@fulexo.local
ADMIN_PASSWORD=FulexoAdmin2024!
FULEXO_TO_KARRIO_API_TOKEN=fulexo_to_karrio_internal_token_2024_change_in_production
FULEXO_INTERNAL_API_TOKEN=fulexo_internal_api_token_2024_change_in_production

# =============================================================================
# CARRIER CREDENTIALS (Optional)
# =============================================================================
UPS_USERNAME=
UPS_PASSWORD=
UPS_ACCESS_LICENSE_NUMBER=

# =============================================================================
# EMAIL/SMTP CONFIGURATION (Optional)
# =============================================================================
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@fulexo.local

# =============================================================================
# MONITORING & OBSERVABILITY
# =============================================================================
GF_SECURITY_ADMIN_PASSWORD=fulexo_grafana_admin_2024
LOG_LEVEL=info

# =============================================================================
# RATE LIMITING
# =============================================================================
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# =============================================================================
# FEATURE FLAGS
# =============================================================================
ENABLE_2FA=true
ENABLE_AUDIT_LOGGING=true
ENABLE_METRICS=true

# =============================================================================
# DOCKER COMPOSE CONFIGURATION
# =============================================================================
ENV_FILE=.env
COMPOSE_PROJECT_NAME=fulexo
```

### Step 2: Copy to compose directory

Also create the same `.env` file in the `compose/` directory:

```bash
cp .env compose/.env
```

## Environment Variables Explained

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5433/dbname` |
| `REDIS_URL` | Redis/Valkey connection string | `redis://localhost:6380` |
| `JWT_SECRET` | JWT signing secret (64+ chars) | Generated secure string |
| `ENCRYPTION_KEY` | Data encryption key (32 chars) | Generated secure string |
| `DOMAIN_API` | API domain | `localhost:3000` |
| `DOMAIN_APP` | Frontend domain | `localhost:3001` |
| `NEXT_PUBLIC_API_BASE` | Public API base URL | `http://localhost:3000/api` |
| `NEXT_PUBLIC_APP_URL` | Public app URL | `http://localhost:3001` |
| `S3_ENDPOINT` | MinIO/S3 endpoint | `http://localhost:9000` |
| `S3_ACCESS_KEY` | S3 access key | Generated key |
| `S3_SECRET_KEY` | S3 secret key | Generated secret |
| `S3_BUCKET` | S3 bucket name | `fulexo-uploads` |

### Karrio-Specific Variables

| Variable | Description |
|----------|-------------|
| `KARRIO_SECRET_KEY` | Django secret key for Karrio |
| `KARRIO_POSTGRES_*` | Karrio database credentials |
| `FULEXO_TO_KARRIO_API_TOKEN` | Internal API token for Fulexo→Karrio |
| `FULEXO_INTERNAL_API_TOKEN` | Internal API token for Worker→API |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `SMTP_*` | Email configuration for notifications |
| `UPS_*`, `FEDEX_*`, `DHL_*` | Carrier API credentials |
| `LOG_LEVEL` | Logging verbosity (debug, info, warn, error) |

## Security Notes

⚠️ **IMPORTANT**: The values provided above are for **DEVELOPMENT/TESTING ONLY**.

For production deployment:
1. Generate secure random values for all secrets
2. Use strong passwords (minimum 16 characters)
3. Enable HTTPS/TLS
4. Use environment-specific secrets management (e.g., AWS Secrets Manager, HashiCorp Vault)
5. Never commit `.env` files to version control

## Generating Secure Secrets

### JWT Secret (64+ characters)
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Encryption Key (32 characters)
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### Master Key Hex (64 characters)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Validation

After creating the `.env` file, the API will automatically validate all required variables on startup. If any required variable is missing or invalid, you'll see a clear error message indicating which variable needs to be fixed.

Reference: `apps/api/src/config/shared-env.validation.ts`

