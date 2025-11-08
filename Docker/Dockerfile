# Multi-stage Dockerfile for CodeGuardian Pro
# Stage 1: Frontend Build
FROM node:18-alpine AS frontend-builder

# Set working directory for frontend
WORKDIR /app/frontend

# Copy package files
COPY package*.json ./
COPY package-lock.json* ./

# Install frontend dependencies
RUN npm ci --only=production --silent

# Copy frontend source code
COPY src/ ./src/
COPY public/ ./public/
COPY *.config.js ./
COPY *.json ./
COPY .env.example ./

# Build frontend
RUN npm run build

# Stage 2: Backend Build
FROM node:18-alpine AS backend-builder

# Set working directory for backend
WORKDIR /app/backend

# Copy package files
COPY server/package*.json ./
COPY server/package-lock.json* ./

# Install backend dependencies
RUN npm ci --only=production --silent

# Copy backend source code
COPY server/ ./server/

# Stage 3: Production Image
FROM node:18-alpine AS production

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    curl \
    bash \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S codeguardian -u 1001

# Set working directory
WORKDIR /app

# Create necessary directories
RUN mkdir -p /app/uploads /app/logs /app/temp && \
    chown -R codeguardian:nodejs /app

# Copy backend dependencies and source
COPY --from=backend-builder --chown=codeguardian:nodejs /app/backend/node_modules ./node_modules
COPY --from=backend-builder --chown=codeguardian:nodejs /app/backend/server ./server

# Copy frontend build
COPY --from=frontend-builder --chown=codeguardian:nodejs /app/frontend/build ./public

# Copy configuration files
COPY --chown=codeguardian:nodejs package.json ./
COPY --chown=codeguardian:nodejs docker-entrypoint.sh ./
COPY --chown=codeguardian:nodejs .env.example ./

# Create SSL directory for certificates
RUN mkdir -p /app/ssl && chown codeguardian:nodejs /app/ssl

# Switch to non-root user
USER codeguardian

# Expose application port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0
ENV UPLOAD_DIR=/app/uploads
ENV TEMP_DIR=/app/temp
ENV LOG_DIR=/app/logs

# Set permissions for upload and temp directories
RUN chmod 755 /app/uploads /app/temp /app/logs

# Create entrypoint script
RUN cat > /app/docker-entrypoint.sh << 'EOF'
#!/bin/bash
set -e

# Function to wait for database
wait_for_db() {
    echo "Waiting for database to be ready..."
    while ! curl -s http://$MONGODB_HOST:$MONGODB_PORT > /dev/null; do
        sleep 1
    done
    echo "Database is ready!"
}

# Function to initialize application
init_app() {
    echo "Initializing CodeGuardian Pro..."
    
    # Create necessary directories
    mkdir -p /app/uploads/projects /app/uploads/temp /app/logs
    
    # Set permissions
    chmod 755 /app/uploads /app/uploads/projects /app/uploads/temp /app/logs
    
    # Check if we need to wait for database
    if [ "$WAIT_FOR_DB" = "true" ]; then
        wait_for_db
    fi
    
    # Run database initialization if needed
    if [ "$INIT_DATABASE" = "true" ]; then
        echo "Initializing database..."
        node server/scripts/init-db.js
    fi
    
    # Create sample data in development
    if [ "$NODE_ENV" = "development" ] && [ "$CREATE_SAMPLE_DATA" = "true" ]; then
        echo "Creating sample data..."
        node server/scripts/create-sample-data.js
    fi
}

# Handle shutdown gracefully
graceful_shutdown() {
    echo "Received shutdown signal, stopping application..."
    kill -TERM "$APP_PID" 2>/dev/null
    wait "$APP_PID"
    echo "Application stopped gracefully."
    exit 0
}

# Set up signal handlers
trap 'graceful_shutdown' SIGTERM SIGINT

# Initialize application
init_app

# Start the application
echo "Starting CodeGuardian Pro server..."
node server/server.js &

# Get the application PID
APP_PID=$!

# Wait for the application to start
sleep 5

# Check if application is running
if ps -p $APP_PID > /dev/null; then
    echo "Application started successfully with PID: $APP_PID"
    
    # Wait for the application process
    wait $APP_PID
else
    echo "Failed to start application"
    exit 1
fi
EOF

# Make entrypoint script executable
RUN chmod +x /app/docker-entrypoint.sh

# Create startup script
RUN cat > /app/start.sh << 'EOF'
#!/bin/bash
set -e

echo "==========================================="
echo "🚀 CodeGuardian Pro - Starting Container"
echo "==========================================="
echo "Environment: $NODE_ENV"
echo "Port: $PORT"
echo "Host: $HOST"
echo "==========================================="

# Run the entrypoint script
exec /app/docker-entrypoint.sh
EOF

RUN chmod +x /app/start.sh

# Create directories for persistent data
VOLUME ["/app/uploads", "/app/logs", "/app/ssl"]

# Use the startup script
ENTRYPOINT ["/app/start.sh"]

# Stage 4: Development Image (optional)
FROM node:18-alpine AS development

# Install development tools
RUN apk update && apk add --no-cache \
    curl \
    bash \
    python3 \
    make \
    g++ \
    git \
    vim \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S codeguardian -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install all dependencies (including dev dependencies)
RUN npm install && cd server && npm install

# Copy source code
COPY . .

# Set permissions
RUN chown -R codeguardian:nodejs /app && \
    mkdir -p /app/uploads /app/logs /app/temp && \
    chown -R codeguardian:nodejs /app/uploads /app/logs /app/temp

# Switch to non-root user
USER codeguardian

# Expose ports (frontend + backend)
EXPOSE 3000 5000

# Environment variables for development
ENV NODE_ENV=development
ENV PORT=5000
ENV HOST=0.0.0.0
ENV FRONTEND_PORT=3000

# Health check for development
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Development entrypoint
CMD ["/bin/bash", "-c", "npm run dev & cd server && npm run dev"]

# Stage 5: NGINX Reverse Proxy (optional)
FROM nginx:alpine AS nginx-proxy

# Install nginx and copy configuration
RUN apk update && apk upgrade && \
    rm -rf /var/cache/apk/*

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d/ /etc/nginx/conf.d/

# Copy SSL certificates (if available)
COPY ssl/ /etc/nginx/ssl/

# Copy frontend build
COPY --from=frontend-builder /app/frontend/build /usr/share/nginx/html

# Create nginx cache directories
RUN mkdir -p /var/cache/nginx && \
    mkdir -p /var/run/nginx

# Expose ports
EXPOSE 80 443

# Health check for nginx
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Labels for better container management
LABEL maintainer="CodeGuardian Pro Team <team@codeguardian.pro>"
LABEL version="1.0.0"
LABEL description="AI-Powered Complete Project Debugging Platform"
LABEL website="https://codeguardian.pro"
LABEL documentation="https://docs.codeguardian.pro"

# Security labels
LABEL security.scan=true
LABEL security.updated=$(date +%Y-%m-%d)

# Multi-architecture support
# This Dockerfile supports multiple architectures through buildx
# To build for multiple platforms, use: docker buildx build --platform linux/amd64,linux/arm64