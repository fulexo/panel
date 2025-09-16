FROM node:20-alpine as build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

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

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY package*.json ./

# Verify Prisma client
RUN node -e "try{require('fs').accessSync('./node_modules/.prisma/client');}catch(e){process.exit(1)}"

# Clean up build artifacts
RUN rm -rf /tmp/* /var/cache/apk/*

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node","dist/main.js"]