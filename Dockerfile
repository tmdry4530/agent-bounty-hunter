# Multi-stage Dockerfile for Agent Bounty Hunter API
# Optimized for Bun runtime

# ============================================
# Stage 1: Base
# ============================================
FROM oven/bun:1 AS base
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# ============================================
# Stage 2: Dependencies
# ============================================
FROM base AS dependencies

# Copy package files
COPY package.json bun.lockb ./
COPY backend/package.json ./backend/

# Install all dependencies (including dev)
RUN bun install --frozen-lockfile

# ============================================
# Stage 3: Build
# ============================================
FROM dependencies AS build

# Copy source code
COPY . .

# Build TypeScript
WORKDIR /app/backend
RUN bun run build

# ============================================
# Stage 4: Production Dependencies
# ============================================
FROM base AS prod-dependencies

COPY package.json bun.lockb ./
COPY backend/package.json ./backend/

# Install only production dependencies
RUN bun install --production --frozen-lockfile

# ============================================
# Stage 5: Production
# ============================================
FROM base AS production

# Set environment
ENV NODE_ENV=production \
    API_PORT=3000 \
    API_HOST=0.0.0.0

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bun

# Copy production dependencies
COPY --from=prod-dependencies --chown=bun:nodejs /app/node_modules ./node_modules
COPY --from=prod-dependencies --chown=bun:nodejs /app/backend/node_modules ./backend/node_modules

# Copy built application
COPY --from=build --chown=bun:nodejs /app/backend/dist ./backend/dist
COPY --from=build --chown=bun:nodejs /app/backend/package.json ./backend/
COPY --from=build --chown=bun:nodejs /app/deployments ./deployments

# Create logs directory
RUN mkdir -p /app/logs && chown -R bun:nodejs /app/logs

# Switch to non-root user
USER bun

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start command
WORKDIR /app/backend
CMD ["bun", "run", "start"]

# For indexer: bun run src/indexer/index.ts

# ============================================
# Stage 6: Development
# ============================================
FROM dependencies AS development

ENV NODE_ENV=development

# Install additional dev tools
RUN bun add -g nodemon

# Copy all source code
COPY . .

WORKDIR /app/backend

EXPOSE 3000

CMD ["bun", "run", "dev"]
