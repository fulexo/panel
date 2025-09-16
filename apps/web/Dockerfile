FROM node:20-alpine as build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

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
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.js ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S fulexo -u 1001

# Change ownership of the app directory
RUN chown -R fulexo:nodejs /app
USER fulexo

# Clean up build artifacts
RUN rm -rf /tmp/* /var/cache/apk/*

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3001/health || exit 1

EXPOSE 3001
CMD ["npm", "start"]