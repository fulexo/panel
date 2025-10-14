# Multi-stage Dockerfile for Worker
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/worker/package*.json ./apps/worker/

# Install dependencies
RUN cd apps/worker && npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY . .

# Generate Prisma client
RUN cd apps/worker && npx prisma generate --schema ../api/prisma/schema.prisma

# Build the application
RUN cd apps/worker && npm run build

# Production image
FROM base AS production
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

# Copy built application
COPY --from=builder --chown=worker:nodejs /app/apps/worker/dist ./dist
COPY --from=builder --chown=worker:nodejs /app/apps/worker/node_modules ./node_modules
COPY --from=builder --chown=worker:nodejs /app/apps/worker/package*.json ./
COPY --from=builder --chown=worker:nodejs /app/apps/api/prisma ./prisma

# Create logs directory
RUN mkdir -p /app/logs && chown worker:nodejs /app/logs

USER worker

EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

CMD ["node", "dist/index.js"]