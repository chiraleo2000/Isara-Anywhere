FROM node:22-alpine

WORKDIR /app

# Install wget for healthcheck
RUN apk add --no-cache wget

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application
COPY . .
COPY shared/corsPolicy.cjs ./shared/corsPolicy.cjs
COPY shared/corsPolicy.cjs /shared/corsPolicy.cjs
RUN test -f ./shared/corsPolicy.cjs || (echo "FATAL: shared/corsPolicy.cjs missing in image" && exit 1)

# Create non-root user and recordings directory
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && mkdir -p /app/recordings && chown appuser:appgroup /app/recordings
USER appuser

# Expose port
EXPOSE 3020

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3020

# Health check - give more time to start
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3020/health || exit 1

# Start server
CMD ["node", "backend/index.js"]
