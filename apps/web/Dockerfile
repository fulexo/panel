FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci || npm i
COPY . .
RUN npx next build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app .
EXPOSE 3000
CMD ["npx","next","start","-p","3000"]