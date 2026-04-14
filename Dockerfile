# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /build

# corepack ships with Node 20; use it to activate pnpm.
# pnpm is required because the reading-time plugin uses workspace:* syntax.
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace manifests first so Docker can cache the install layer
# independently of source changes.
COPY package.json pnpm-workspace.yaml ./
COPY plugins/reading-time/package.json ./plugins/reading-time/

# Install all dependencies (devDeps included — needed for TypeScript compilation).
# --shamefully-hoist produces a flat node_modules compatible with COPY --from.
RUN pnpm install --shamefully-hoist

# Copy source files and compile
COPY tsconfig.json ./
COPY src/ ./src/
COPY plugins/ ./plugins/
RUN npm run build

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

# Copy flat node_modules from the builder stage.
# Same Alpine base image ensures no native-addon architecture mismatches.
COPY --from=builder /build/node_modules ./node_modules

# Copy compiled JavaScript output
COPY --from=builder /build/dist ./dist

# Bake default templates into the image as a fallback.
# entrypoint.sh seeds these into the content volume on first run if the user
# has not provided their own templates (e.g. via git-sync or a bind mount).
COPY templates/ ./defaults/templates/

# Copy and make the entrypoint executable
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# /app/content is the runtime content volume:
#   /app/content/articles/   — Markdown article files
#   /app/content/templates/  — EJS templates
#
# Populate this volume via a local bind mount or a git-sync sidecar.
# See docker-compose.yml and the README for details.
VOLUME ["/app/content"]

ENV BASE_PATH=/app/content
ENV PORT=3001
ENV NODE_ENV=production

EXPOSE 3001

ENTRYPOINT ["./entrypoint.sh"]
