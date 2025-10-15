# Multi-stage Dockerfile for Web App
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/

# Install dependencies
RUN cd apps/web && npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .

# Build the application (skip lint to avoid devDeps in production image)
RUN cd apps/web && npm run build -- --no-lint

# Production image
FROM base AS production
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install curl for HEALTHCHECK
RUN apk add --no-cache curl

# Copy runtime artifacts
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next /app/apps/web/.next
COPY --from=deps --chown=nextjs:nodejs /app/apps/web/node_modules /app/apps/web/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package*.json /app/apps/web/

WORKDIR /app/apps/web
USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

CMD ["npm", "run", "start"]