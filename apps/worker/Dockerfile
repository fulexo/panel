FROM node:20-alpine
WORKDIR /app

# Install wget for HEALTHCHECK
RUN apk add --no-cache wget

# Copy worker package files
COPY apps/worker/package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy worker source
COPY apps/worker/ .

# Copy Prisma schema from API and generate client
COPY apps/api/prisma/schema.prisma /app/prisma/schema.prisma
RUN npm run prisma:generate || npx prisma generate --schema /app/prisma/schema.prisma || true

# Clean up build artifacts
RUN rm -rf /tmp/* /var/cache/apk/*

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3001/health || exit 1

EXPOSE 3001
CMD ["node","index.js"]