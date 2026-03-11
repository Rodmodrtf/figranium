# This Dockerfile supports multi-arch builds (linux/amd64, linux/arm64)
FROM node:22-bullseye AS build

WORKDIR /app

# Install deps (include dev deps for build)
COPY package*.json ./
COPY scripts ./scripts

ENV DOPPELGANGER_SKIP_PLAYWRIGHT_INSTALL=1 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN npm ci --include=dev

# Build frontend
COPY . .
RUN npm run build


FROM mcr.microsoft.com/playwright:v1.57.0-jammy AS runtime

WORKDIR /app

# Build arguments
ARG INSTALL_VNC=1
ARG PLAYWRIGHT_BROWSERS="chromium firefox"

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production

# Optional VNC stack
RUN if [ "$INSTALL_VNC" = "1" ]; then \
    apt-get -o Acquire::Retries=3 -o Acquire::http::Timeout=30 -o Acquire::https::Timeout=30 update \
    && apt-get install -y --no-install-recommends \
    novnc \
    websockify \
    x11vnc \
    xvfb \
    curl \
    openssl \
    ca-certificates \
    fonts-liberation \
    fonts-noto-color-emoji \
    fonts-freefont-ttf \
    dbus-x11 \
    && rm -rf /var/lib/apt/lists/*; \
    fi

# Install production deps
COPY package*.json ./
COPY scripts ./scripts

ENV DOPPELGANGER_SKIP_PLAYWRIGHT_INSTALL=1 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN npm ci --omit=dev

# Install selected Playwright browsers
RUN echo "Installing Playwright browsers: $PLAYWRIGHT_BROWSERS" \
    && npx playwright install --with-deps $PLAYWRIGHT_BROWSERS

# Copy application
COPY --from=build /app/dist /app/dist
COPY --from=build /app/public /app/public
COPY --from=build /app/*.js /app/
COPY --from=build /app/src /app/src
COPY --from=build /app/start-vnc.sh /app/start-vnc.sh

RUN sed -i 's/\r$//' /app/start-vnc.sh && chmod +x /app/start-vnc.sh

EXPOSE 11345 54311

CMD ["/app/start-vnc.sh"]