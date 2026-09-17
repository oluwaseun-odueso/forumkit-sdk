FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/ai/package.json ./packages/ai/
COPY packages/storage/package.json ./packages/storage/
COPY packages/db/package.json ./packages/db/
COPY packages/api/package.json ./packages/api/

# Install dependencies. Not --omit=dev: packages/api and packages/db both
# run via tsx (see CMD below) rather than a compiled build - tsx is a
# devDependency of each, so dev deps have to stay in for this image to
# actually run. (packages/*'s "build" step is tsc with noEmit, kept below
# purely as a type-check gate - the base tsconfig never emits real output,
# so nothing here depends on that step producing files.)
RUN npm ci --workspace=packages/types \
           --workspace=packages/ai \
           --workspace=packages/storage \
           --workspace=packages/db \
           --workspace=packages/api \
           --ignore-scripts

# Build (type-check gate only - see note above)
FROM base AS builder
COPY packages/types ./packages/types
COPY packages/ai ./packages/ai
COPY packages/storage ./packages/storage
COPY packages/db ./packages/db
COPY packages/api ./packages/api
COPY tsconfig.base.json ./
RUN npm run build --workspace=packages/types
RUN npm run build --workspace=packages/ai
RUN npm run build --workspace=packages/storage
RUN npm run build --workspace=packages/db
RUN npm run build --workspace=packages/api

# Production image
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Single COPY for the whole packages/ tree (rather than one per package/subpath) -
# splitting this into multiple COPY --from=builder instructions against sibling
# subpaths of the same stage triggers a local BuildKit checksum bug
# ("failed to calculate checksum of ref ...: not found") on this machine.
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Migrations run as a short-lived step against DATABASE_URL (DDL-capable)
# and exit before the server starts - the long-running server process below
# never receives that connection string, only DATABASE_POOL_URL. See
# packages/db/src/bin/migrate.ts.
CMD ["sh", "-c", "node --import tsx/esm packages/db/src/bin/migrate.ts && node --import tsx/esm packages/api/src/server.ts"]
