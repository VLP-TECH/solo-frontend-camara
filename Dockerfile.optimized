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

# Build with minimal logging
RUN npm run build --silent && \
    npm cache clean --force && \
    rm -rf node_modules src public *.config.* *.json *.lock *.md .git* /tmp/*

# Ultra-minimal production image
FROM nginx:1.27-alpine AS production

# Install only essential packages
RUN apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Copy built application
COPY --from=base /app/dist /usr/share/nginx/html

# Minimal nginx config
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    gzip on; \
    gzip_types text/css application/javascript; \
    location / { try_files $uri $uri/ /index.html; } \
    location ~* \.(js|css)$ { expires 1y; add_header Cache-Control "public, immutable"; } \
}' > /etc/nginx/conf.d/default.conf

# Cleanup
RUN rm -rf /var/cache/nginx/* /tmp/*

EXPOSE 80

ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"]