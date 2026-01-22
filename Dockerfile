FROM node:18-alpine AS build
RUN apk add --no-cache dumb-init
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --prefer-offline --no-audit --progress=false && \
    npm cache clean --force && \
    rm -rf /tmp/* /root/.npm

COPY . .
RUN npm run build --silent

FROM nginx:1.27-alpine AS production
RUN apk add --no-cache dumb-init && rm -rf /var/cache/apk/*
COPY --from=build /app/dist /usr/share/nginx/html

RUN printf '%s\n' \
'server {' \
'  listen 80;' \
'  root /usr/share/nginx/html;' \
'  index index.html;' \
'  gzip on;' \
'  gzip_types text/css application/javascript;' \
'  location / { try_files $uri $uri/ /index.html; }' \
'  location ~* \.(js|css)$ { expires 1y; add_header Cache-Control "public, immutable"; }' \
'}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"]