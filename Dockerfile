# syntax=docker/dockerfile:1.6

# Caddy binary stage — pulled from the official image
FROM caddy:2 AS caddy

# Runtime: Playwright's image ships with Chromium + system deps already installed
FROM mcr.microsoft.com/playwright:v1.60.0-jammy

WORKDIR /app

COPY --from=caddy /usr/bin/caddy /usr/local/bin/caddy

# Enable pnpm via corepack (Node 22 ships with corepack)
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Install deps first so Docker can cache this layer when source changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Ensure the Chromium matching our pinned `playwright` version is on disk. The
# base image preinstalls *a* Chromium but it may not match our package.json,
# and Stagehand rejects mismatches with "CHROME_PATH must be no older than
# Chrome stable". --with-deps would pull system libs; the base image already
# has them, so plain `install` is enough.
RUN pnpm exec playwright install chromium

# Bring in the rest of the source
COPY . .

# NEXT_PUBLIC_* must be inlined at build time. Default to localhost so a bare
# `docker build` still produces a working dev image; fly.toml overrides this
# at deploy time with the public wss URL.
ARG NEXT_PUBLIC_WORKER_WS=ws://localhost:5174
ENV NEXT_PUBLIC_WORKER_WS=$NEXT_PUBLIC_WORKER_WS
RUN pnpm build

# Reverse-proxy + supervisor
COPY Caddyfile /etc/caddy/Caddyfile
COPY scripts/start.sh /app/start.sh
RUN chmod +x /app/start.sh

ENV NODE_ENV=production
ENV WORKER_PORT=5174
ENV WORKER_HTTP_URL=http://localhost:5174
ENV DATA_DIR=/app/data

EXPOSE 8080
CMD ["/app/start.sh"]
