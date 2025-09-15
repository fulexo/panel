FROM node:20-alpine as build
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build Next.js application
RUN npx next build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Copy built application
COPY --from=build /app/next.config.js ./
COPY --from=build /app/package*.json ./
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules

# Clean up build artifacts
RUN rm -rf /tmp/* /var/cache/apk/*

EXPOSE 3000
CMD ["npx","next","start","-p","3000"]