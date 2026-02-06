FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Copy build files to a directory accessible by nginx
FROM alpine:latest
WORKDIR /app
COPY --from=build /app/dist /app/dist