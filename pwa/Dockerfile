FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage - copy files to volume
FROM alpine:latest
WORKDIR /app
COPY --from=build /app/dist /app/dist
CMD ["echo", "Build completed"]