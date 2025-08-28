FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm i
COPY . .
RUN npx tsc

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev || npm i --omit=dev
EXPOSE 3000
CMD ["node","dist/main.js"]