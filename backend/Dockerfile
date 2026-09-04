# Multi-stage so the runtime image doesn't carry the toolchain or dev deps.
# Debian-slim rather than Alpine on purpose: sharp and @resvg/resvg-js ship
# prebuilt native binaries against glibc, and on musl they either fall back to
# a slow build-from-source or fail outright.
FROM node:22-slim AS builder

WORKDIR /app

# Copy manifests first so `npm ci` is cached until dependencies actually
# change, rather than on every source edit.
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# --- runtime -----------------------------------------------------------------
FROM node:22-slim AS runner

ENV NODE_ENV=production
WORKDIR /app

# openssl is required by Prisma's query engine.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
# --omit=dev still runs postinstall (`prisma generate`), which is what puts
# the client in src/generated for the compiled output to import.
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated

# Don't run as root.
USER node

EXPOSE 2666
CMD ["node", "dist/main.js"]
