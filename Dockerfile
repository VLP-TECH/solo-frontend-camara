# Ultra-optimized Dockerfile for limited disk space
FROM node:18-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with aggressive caching and cleanup
RUN npm ci --prefer-offline --no-audit --progress=false && \
    npm cache clean --force && \
    rm -rf /tmp/* /root/.npm

# Copy source code
COPY . .

# Build with minimal logging and cleanup
RUN npm run build --silent && \
    npm cache clean --force && \
    rm -rf /tmp/*

# Ultra-minimal production image
FROM nginx:1.27-alpine AS production

# Install only essential packages
RUN apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Copy built application
COPY --from=base /app/dist /usr/share/nginx/html

# Nginx config with health check endpoint
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    gzip on; \
    gzip_types text/css application/javascript application/json image/svg+xml; \
    \
    # Health check endpoint for EasyPanel \
    location = /health { \
        add_header Content-Type text/plain; \
        return 200 "ok\n"; \
    } \
    \
    # SPA routing \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    # Cache static assets \
    location ~* \.(js|css)$ { \
        expires 1y; \
        add_header Cache-Control "public, immutable"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Cleanup
RUN rm -rf /var/cache/nginx/* /tmp/*

EXPOSE 80

# Health check for EasyPanel monitoring
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"]