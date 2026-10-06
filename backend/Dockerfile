# ==============================================================================
# Production Dockerfile for Chess Evolve Express Backend
# ==============================================================================

# Stage 1: Dependencies and Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build prerequisites
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci
RUN npx prisma generate --schema=./prisma/schema.prisma

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Install Stockfish engine binary
RUN apk add --no-cache stockfish ca-certificates

ENV NODE_ENV=production
ENV PORT=5000
ENV STOCKFISH_PATH=/usr/bin/stockfish

# Copy application files and node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY prisma ./prisma
COPY src ./src

# Create non-root user
USER node

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "src/index.js"]
