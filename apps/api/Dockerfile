FROM node:20-alpine as build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript
RUN npx tsc

# Production stage
FROM node:20-alpine
WORKDIR /app

# Install wget for HEALTHCHECK
RUN apk add --no-cache wget

# Copy package files for production install
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Generate Prisma client in production
RUN npx prisma generate

# Verify Prisma client
RUN node -e "try{require('fs').accessSync('./node_modules/.prisma/client');}catch(e){process.exit(1)}"

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S fulexo -u 1001

# Change ownership of the app directory
RUN chown -R fulexo:nodejs /app
USER fulexo

# Clean up build artifacts
RUN rm -rf /tmp/* /var/cache/apk/*

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node","dist/main.js"]