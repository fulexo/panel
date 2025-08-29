FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache wget

# Copy worker package and install deps
COPY apps/worker/package*.json ./
RUN npm ci || npm i

# Copy worker source
COPY apps/worker/ .

# Copy Prisma schema from API and generate client
COPY apps/api/prisma/schema.prisma /app/prisma/schema.prisma
RUN npm run prisma:generate || npx prisma generate --schema /app/prisma/schema.prisma || true

HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3001/health || exit 1
EXPOSE 3001
CMD ["node","index.js"]