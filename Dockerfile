# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile --network-timeout 1000000

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Production stage
FROM alpine:3.21 AS prod

ENV NODE_VERSION 22.17.0
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install only production dependencies
RUN yarn install --frozen-lockfile --production --network-timeout 1000000 && yarn cache clean

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user and change ownership
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/main"]
