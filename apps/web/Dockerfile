FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
# Inject public API base at build-time for client bundles
ARG NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
COPY . .
RUN npx next build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app .
EXPOSE 3000
CMD ["npx","next","start","-p","3000"]