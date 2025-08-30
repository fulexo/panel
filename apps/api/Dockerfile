FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npx tsc

FROM node:20-alpine
WORKDIR /app
# Install wget for HEALTHCHECK
RUN apk add --no-cache wget
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./
COPY --from=build /app/prisma ./prisma
RUN node -e "try{require('fs').accessSync('./node_modules/.prisma/client');}catch(e){process.exit(1)}"
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3000/health || exit 1
EXPOSE 3000
CMD ["node","dist/main.js"]