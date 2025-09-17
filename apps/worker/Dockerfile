FROM node:20-alpine as build
WORKDIR /app

# Copy worker package files
COPY apps/worker/package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy worker source
COPY apps/worker/ .

# Copy Prisma schema from API and generate client
COPY apps/api/prisma/schema.prisma /app/prisma/schema.prisma
RUN npm run prisma:generate || npx prisma generate --schema /app/prisma/schema.prisma || true

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Install wget for HEALTHCHECK
RUN apk add --no-cache wget

# Copy package files for production install
COPY apps/worker/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Generate Prisma client in production
RUN npx prisma generate --schema /app/prisma/schema.prisma || true

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S fulexo -u 1001

# Change ownership of the app directory
RUN chown -R fulexo:nodejs /app
USER fulexo

# Clean up build artifacts
RUN rm -rf /tmp/* /var/cache/apk/*

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3002/health || exit 1

EXPOSE 3002
CMD ["node","dist/index.js"]