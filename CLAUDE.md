# CLAUDE.md — AI Agent Instructions

This file provides context for AI agents and Claude instances working on this project. Read it before making changes.

---

## What this project is

Nodebook is a file-based Markdown blog engine. It has no database. Articles and templates are read fresh from disk on **every HTTP request** — there is no in-memory cache. This is architecturally significant: updating files in the content volume is sufficient to serve new content without restarting the app.

---

## Two-audience structure

The repository serves two distinct audiences. Keep them separate when making changes.

**Part 1 — the public repo** (`docker-compose.yml`, `Dockerfile`, `entrypoint.sh`, source code, default templates):
- Generic, reusable by anyone
- `docker-compose.yml` is a minimal single-service setup using a local bind-mounted `./content` directory
- Default templates are baked into the Docker image as a fallback at `/app/defaults/templates/`

**Part 2 — the owner's private fork** (`docker-compose.production.yml`, `Caddyfile`, `scripts/git-sync.sh`, `.env.example`):
- Production deployment wiring specific to running behind a reverse proxy with automatic git-sync
- `docker-compose.production.yml` is the full three-service stack: nodebook + git-sync sidecar + Caddy
- These files live in the public repo as committed references, but are intended to be customised in the private fork

Do not conflate the two compose files. `docker-compose.yml` is for generic local use. `docker-compose.production.yml` is for production and requires `.env` to be configured.

---

## Package manager: pnpm, not npm

The project uses **pnpm** for installation, not npm. The `plugins/reading-time` package declares `"nodebook": "workspace:*"` — pnpm workspace syntax. Running `npm install` will not correctly resolve the workspace dependency.

- Install with: `pnpm install`
- Build with: `npm run build` (scripts are in `package.json` and work with either)
- In the Dockerfile, the builder stage uses `pnpm install --shamefully-hoist` to produce a flat `node_modules/` that can be safely copied to the production stage with `COPY --from=builder`
- There is a `package-lock.json` in the repo — this is a historical artefact, not the authoritative lockfile

---

## Docker content model

The content volume (`/app/content`) holds both `articles/` and `templates/`. Neither is baked into the production image.

```
/app/
  dist/              ← compiled JS, baked into image
  defaults/
    templates/       ← fallback templates, baked into image
  node_modules/      ← baked into image
  content/           ← VOLUME mount point (not in image)
    articles/        ← populated by git-sync or bind mount
    templates/       ← populated by git-sync or bind mount
```

`entrypoint.sh` seeds `defaults/templates/` into `content/templates/` on first run **only if the directory does not already exist**. It does not overwrite user-customised templates.

`BASE_PATH` must be set to `/app/content` in all container configurations. If you see the app looking for templates or articles in the wrong place, check this env var first.

---

## git-sync sidecar

The git-sync container uses `alpine/git` and runs `scripts/git-sync.sh`. Key behaviours to be aware of:

- Uses `fetch + reset --hard` (not `git pull`) — always brings the branch to the exact remote state, idempotent on restart
- Syncs both `articles/` and `templates/` — template customisations in the fork propagate automatically
- The SSH deploy key is mounted `:ro` at `/root/.ssh/deploy_key`; the script copies it to `id_ed25519` and `chmod 600`s the copy (required because SSH rejects world-readable keys)
- The `git_repo_cache` named volume persists the clone across container restarts — the script detects an existing `.git` directory and skips re-cloning, only running `fetch`
- `set -e` means any SSH auth failure or unreachable repo causes the container to exit and restart (per `restart: unless-stopped`)

---

## Files never to commit

The following are in `.gitignore` and must never be committed:

- `deploy_key` — SSH private key
- `deploy_key.pub` — corresponding public key
- `.env` — contains the private fork URL and key path

`.env.example` is committed and documents all variables with inline comments. When helping the user configure their deployment, always direct them to copy `.env.example` to `.env` rather than creating `.env` from scratch.

---

## Caddyfile

`Caddyfile` contains a `yourdomain.com` placeholder. It must be updated with the real domain before deploying. Caddy handles TLS certificate issuance and renewal automatically — no manual certificate steps are needed. Ports 80 and 443 must be reachable from the internet and the domain's DNS A record must point to the server.

---

## Documentation layout

| File | Audience | Contents |
|---|---|---|
| `README.md` | End users | Article writing, configuration, Docker deployment |
| `DEVELOPMENT.md` | Contributors | Architecture, scripts, plugin authoring, project structure |
| `TESTING.md` | Developers / AI agents | Full testing strategy with exact commands, from unit tests to full production stack |
| `CLAUDE.md` | AI agents | This file |

When adding features or making significant changes, keep documentation updates in scope: README for user-facing changes, DEVELOPMENT.md for structural/architectural changes, TESTING.md for new test steps.

---

## Key things to check before making changes

- **Adding or renaming source files**: ensure `tsconfig.json` and the plugin's `tsconfig.json` project references still resolve correctly after the change
- **Changing `BASE_PATH` logic**: it affects article loading (`ArticleFileService`), template rendering (`EjsTemplateRenderService`), and static file serving (`app.ts`) simultaneously — all three must be consistent
- **Modifying `docker-compose.production.yml`**: the `content_data` volume is shared between `nodebook` and `git-sync`; any change to mount paths must be updated in both services
- **Changing `entrypoint.sh`**: the seeding logic checks for the existence of `content/templates/` as a directory — it does not check individual files, so a partial template directory will not be re-seeded
- **PORT configuration**: `AppSettings.PORT` is now read from `process.env.PORT` with `parseInt(..., 10)`. Polka's `.listen()` expects a number, not a string — do not revert to passing the env var directly
