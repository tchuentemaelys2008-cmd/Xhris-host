FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm install --only=production

# Build
FROM base AS builder
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
RUN echo "=== dist/index.js preview ===" && head -5 dist/index.js

# Production
FROM base AS runner
ENV NODE_ENV=production

RUN apk add --no-cache openssl docker-cli git unzip

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 xhris

COPY --from=builder --chown=xhris:nodejs /app/dist ./dist
COPY --from=builder --chown=xhris:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=xhris:nodejs /app/prisma ./prisma
COPY --from=builder --chown=xhris:nodejs /app/package.json ./

RUN mkdir -p logs && chown xhris:nodejs logs

# The backend controls sibling bot/server containers through the mounted Docker
# socket, which requires root-equivalent access inside this container.
USER root

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
