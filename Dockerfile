FROM node:22-alpine

WORKDIR /app

# Install curl for container health checks
RUN apk add --no-cache curl

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Ensure data directory exists for SQLite
RUN mkdir -p data

# Expose API port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3001}/health || exit 1

# Start bot and bridge API
CMD ["npm", "start"]
