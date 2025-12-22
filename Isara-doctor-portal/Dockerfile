# Multi-stage build for Izara Doctor Portal Frontend
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY . .

ARG BUILD_ENV=production
ENV NODE_ENV=${BUILD_ENV}

RUN npm run build

RUN ls -la /app/dist && echo "✅ Build completed successfully"

FROM nginx:alpine

RUN apk add --no-cache bash curl

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

RUN echo '#!/bin/bash\nset -e\nenvsubst < /usr/share/nginx/html/env-config.template.js > /usr/share/nginx/html/env-config.js\nexec "$@"' > /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

RUN echo 'window.ENV = {\n  API_URL: "${VITE_API_URL}",\n  AUTH_URL: "${VITE_AUTH_URL}",\n  GCS_API_URL: "${GCS_API_URL}"\n};' > /usr/share/nginx/html/env-config.template.js

RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
