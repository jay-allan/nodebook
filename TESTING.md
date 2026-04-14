# Nodebook — Testing Guide

This document describes how to verify the application and its production deployment configuration at each level. Tests are ordered from fastest and most self-contained to those requiring external infrastructure.

| Test | What it catches |
|---|---|
| [1. TypeScript build](#1-typescript-build) | Compilation errors, type errors |
| [2. Unit tests](#2-unit-tests) | Regressions in application logic |
| [3. Shell script syntax](#3-shell-script-syntax) | Syntax errors in `entrypoint.sh` / `git-sync.sh` |
| [4. Caddyfile validation](#4-caddyfile-validation) | Caddy config errors |
| [5. Docker image build](#5-docker-image-build) | Dockerfile errors, missing files |
| [6. Generic docker-compose](#6-generic-docker-compose) | Container startup, template seeding, app serving |
| [7. git-sync sidecar](#7-git-sync-sidecar) | Clone + copy behaviour of `scripts/git-sync.sh` |
| [8. Full production stack](#8-full-production-stack) | End-to-end HTTPS and automatic article sync (requires VPS + domain) |

---

## 1. TypeScript build

Verifies the entire codebase compiles without errors.

```bash
npm run build
```

Optionally confirm the compiled output reflects the PORT change:

```bash
grep -A3 "PORT" dist/app.js
# Should show parseInt rather than a hardcoded 3001
```

---

## 2. Unit tests

Runs the Jest suite. Tests live alongside source files (`*.test.ts`) and are excluded from compiled output.

```bash
npm test
```

The suite uses [Jest](https://jestjs.io) with `ts-jest` and shares compiler settings with production code via `src/tsconfig.json`.

---

## 3. Shell script syntax

Validates shell syntax in both scripts without executing them. No shell state is affected.

```bash
sh -n entrypoint.sh
sh -n scripts/git-sync.sh
```

Both commands should return silently. Any output indicates a syntax error.

---

## 4. Caddyfile validation

Uses the official Caddy image to validate the config file. The `yourdomain.com` placeholder is fine — Caddy validates syntax, not DNS.

```bash
docker run --rm \
  -v "$(pwd)/Caddyfile:/etc/caddy/Caddyfile:ro" \
  caddy:alpine caddy validate --config /etc/caddy/Caddyfile
```

---

## 5. Docker image build

Builds the production image end-to-end and verifies key files are present inside it.

```bash
docker build -t nodebook:test .

# Compiled app is present
docker run --rm nodebook:test ls /app/dist

# Default templates were baked in as fallback
docker run --rm nodebook:test ls /app/defaults/templates
```

---

## 6. Generic docker-compose

Tests the full container lifecycle: image build, `entrypoint.sh` template seeding, and the app serving HTTP responses.

```bash
mkdir -p content/articles
cp articles/test.md content/articles/

docker compose up -d --build

# App responds
curl -s http://localhost:3001/ | head -30

# entrypoint.sh seeded the default templates
ls content/templates/

# No errors in container logs
docker compose logs nodebook

# Tear down
docker compose down
rm -rf content/
```

---

## 7. git-sync sidecar

Tests the clone-and-copy logic of `scripts/git-sync.sh` using the public repo over HTTPS (no SSH deploy key required for this smoke test).

```bash
docker run --rm \
  -v /tmp/test-repo:/repo \
  -v /tmp/test-content:/content \
  alpine/git sh -c "
    git clone --depth 1 https://github.com/jay-allan/nodebook.git /repo &&
    cp -r /repo/articles/. /content/ &&
    cp -r /repo/templates/. /content/ &&
    ls /content
  "
```

Expected output: `articles` and `templates` directories listed under `/tmp/test-content`.

To test the full script including SSH authentication, run it with a real deploy key against the private fork:

```bash
docker run --rm \
  -e GIT_REPO=git@github.com:your-username/your-fork.git \
  -e GIT_BRANCH=main \
  -e SYNC_INTERVAL=999 \
  -v "$(pwd)/deploy_key:/root/.ssh/deploy_key:ro" \
  -v "$(pwd)/scripts/git-sync.sh:/scripts/git-sync.sh:ro" \
  -v /tmp/test-content:/content \
  -v /tmp/test-repo:/repo \
  --entrypoint /bin/sh \
  alpine/git /scripts/git-sync.sh
```

---

## 8. Full production stack

Run this on the VPS after deploying the private fork with git-sync and Caddy configured.

```bash
# git-sync should show a clone followed by periodic sync messages
docker compose -f docker-compose.production.yml logs -f git-sync

# Confirm the content volume was populated
docker compose -f docker-compose.production.yml exec nodebook ls /app/content/articles
docker compose -f docker-compose.production.yml exec nodebook ls /app/content/templates

# Caddy should show a certificate was obtained (~30s after first start)
docker compose -f docker-compose.production.yml logs caddy

# HTTPS response with HTTP/2 and Caddy server header
curl -I https://yourdomain.com/
```
