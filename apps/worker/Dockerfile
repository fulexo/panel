FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm i
COPY . .
RUN npx prisma generate || npm run prisma:generate || true
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3001/health || exit 1
EXPOSE 3001
CMD ["node","index.js"]