# ==============================================================================
# Production Dockerfile for Chess Evolve React Frontend
# ==============================================================================

# Stage 1: Build static assets
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build Vite SPA with production assets
RUN npm run build

# Stage 2: Nginx Web Server
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget --spider -q http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
