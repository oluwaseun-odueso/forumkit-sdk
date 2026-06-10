FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/ai/package.json ./packages/ai/
COPY packages/api/package.json ./packages/api/

# Install dependencies
RUN npm ci --workspace=packages/types \
           --workspace=packages/ai \
           --workspace=packages/api \
           --ignore-scripts

# Build
FROM base AS builder
COPY packages/types ./packages/types
COPY packages/ai ./packages/ai
COPY packages/api ./packages/api
COPY tsconfig.base.json ./
RUN npm run build --workspace=packages/types
RUN npm run build --workspace=packages/ai
RUN npm run build --workspace=packages/api

# Production image
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/ai/dist ./packages/ai/dist
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/ai/package.json ./packages/ai/
COPY --from=builder /app/packages/api/package.json ./packages/api/
COPY package.json ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "packages/api/dist/server.js"]
