# syntax=docker/dockerfile:1

# =============================================================================
# Autonomous EHS — production Next.js image (Node 22, standalone output)
# =============================================================================
# Immutable build: same Dockerfile + same git ref should yield the same layers when
# build args are fixed. Never bake secrets; pass env at `docker run` / K8s Secret.
#
# Why multi-stage?
#   - "deps"   — cache npm install when package.json / lockfile change rarely.
#   - "builder" — full compile; this layer is discarded except for copied artifacts.
#   - "runner" — tiny runtime: only standalone server + static assets + public/.
#
# Prerequisites:
#   - next.config.ts sets output: "standalone" (see Next.js deploying docs).
#
# Build (from repo root):
#   docker build -t ehs-web:local .
#
# Run (example — use your real secrets manager in production):
#   docker run --rm -p 3000:3000 \
#     -e DATABASE_URL="postgresql://..." \
#     -e BETTER_AUTH_SECRET="..." \  # min 32 chars — see src/lib/env.ts
#     -e BETTER_AUTH_URL="http://localhost:3000" \
#     -e NEXT_PUBLIC_APP_URL="http://localhost:3000" \
#     ehs-web:local
#
# Junior mental model → Kubernetes mapping:
#   COPY / WORKDIR   → container filesystem
#   EXPOSE 3000      → Service targetPort / containerPort
#   CMD              → Deployment pod command (override only if you know why)
#   env at runtime   → ConfigMap + Secret (never commit raw Secret YAML with data)
# =============================================================================

FROM node:26-bookworm-slim AS base
WORKDIR /app
# Disable Next telemetry in CI/images unless org policy wants it.
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `next build` imports server code that loads `src/lib/env.ts`. Real secrets are not
# available (and must not be baked into layers). Match local/CI test ergonomics:
# see `skipValidation` in src/lib/env.ts when SKIP_ENV_VALIDATION is set.
# Runtime pods must still inject DATABASE_URL, BETTER_AUTH_*, NEXT_PUBLIC_APP_URL, etc.
ENV SKIP_ENV_VALIDATION=1
# Full Next production build; emits .next/standalone for the runner stage.
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Listen on all interfaces inside the container so port mapping works from the host / ingress.
ENV HOSTNAME=0.0.0.0

# Run as non-root: limits blast radius if the Node process is compromised.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Next standalone layout: server.js at WORKDIR root; static files under .next/static.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
