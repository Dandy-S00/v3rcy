FROM node:22-bookworm-slim

WORKDIR /app

ARG VITE_APP_ID
ARG VITE_OAUTH_PORTAL_URL
ARG VITE_MAPS_API_URL
ARG VITE_MAPS_API_KEY

ENV VITE_APP_ID=${VITE_APP_ID}
ENV VITE_OAUTH_PORTAL_URL=${VITE_OAUTH_PORTAL_URL}
ENV VITE_MAPS_API_URL=${VITE_MAPS_API_URL}
ENV VITE_MAPS_API_KEY=${VITE_MAPS_API_KEY}

COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .

RUN pnpm build

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=5 CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(response => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["pnpm", "start"]
