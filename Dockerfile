# Web build of Ditty, served at sites.abelhii.com/ditty.
# Caddy strips the /ditty prefix before it proxies here, so nginx serves dist/ at /.
# The HTML still asks for /ditty/... because app.json sets experiments.baseUrl.

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec expo export --platform web

FROM nginxinc/nginx-unprivileged:stable-alpine
LABEL org.opencontainers.image.source="https://github.com/abelhii/ditty" \
      org.opencontainers.image.description="Ditty web build, served at sites.abelhii.com/ditty"
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Runs as uid 101 on 8080: no root, no privileged port.
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
