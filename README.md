# Nodebook

A lightweight, file-based blog engine for Node.js. Write articles in Markdown, drop them in a folder, and Nodebook serves them as a styled website. Extend behaviour through a typed plugin system without touching core code.

## Table of Contents

- [How it works](#how-it-works)
- [Writing articles](#writing-articles)
  - [Frontmatter fields](#frontmatter-fields)
  - [Article visibility](#article-visibility)
  - [Preview mode](#preview-mode)
- [Configuration](#configuration)
- [Templates](#templates)
- [Running the server](#running-the-server)
- [Plugin system](#plugin-system)
- [Deploying with Docker](#deploying-with-docker)
  - [Prerequisites](#prerequisites)
  - [Quick start — local content](#quick-start--local-content)
  - [Environment variables](#environment-variables)
  - [Production deployment — automatic sync from a private fork](#production-deployment--automatic-sync-from-a-private-fork)
  - [HTTPS with Caddy](#https-with-caddy)

---

## How it works

Nodebook reads `.md` files from an `articles/` directory, parses their YAML frontmatter and Markdown body, and renders them using EJS templates. A small [Polka](https://github.com/lukeed/polka) HTTP server handles routing:

- `/` — index page listing all visible articles, sorted by date descending
- `/:id` — individual article page
- `/:id/preview` — article page bypassing visibility rules (useful during drafting)
- Any other path that matches a file on disk is served as a static asset

---

## Writing articles

Articles are Markdown files stored in the `articles/` directory. The filename (without `.md`) becomes the article's URL slug.

**Example:** `articles/my-first-post.md` is served at `/my-first-post`.

Each file must begin with a YAML frontmatter block:

```markdown
---
id: "my-first-post"
title: "My First Post"
date: "2025-06-01"
published: true
---

Your Markdown content goes here.
```

### Frontmatter fields

| Field | Type | Description |
|---|---|---|
| `id` | string | URL slug. Should match the filename. |
| `title` | string | Displayed as the page heading and in the index listing. |
| `date` | string | ISO 8601 date (`YYYY-MM-DD`). Controls publish scheduling. |
| `published` | boolean | Must be `true` for the article to be visible. |

### Article visibility

An article appears on the index and is accessible by URL only when **both** conditions are met:

1. `published: true` in frontmatter
2. `date` is today or in the past

This makes scheduled publishing straightforward — set a future date and the article will go live automatically once that date is reached.

### Preview mode

Append `/preview` to any article URL to bypass the visibility check:

```
http://localhost:3001/my-draft-post/preview
```

This is useful for reviewing unpublished or future-dated articles before they go live.

---

## Configuration

Nodebook is configured via environment variables:

| Variable | Default | Description |
|---|---|---|
| `BASE_PATH` | Compiled `dist/` directory | Root path for `articles/`, `templates/`, and static assets |
| `PORT` | `3001` | Port the server listens on |
| `NODE_ENV` | — | Set to `production` to silence the logger and suppress console output |

---

## Templates

Nodebook uses [EJS](https://ejs.co) templates stored in the `templates/` directory. The following templates are required:

| File | Purpose |
|---|---|
| `header.ejs` | Shared HTML `<head>` and opening tags, receives `title` |
| `footer.ejs` | Shared closing tags |
| `index.ejs` | Index page; receives `title` and `articles` (array of `Article`) |
| `article.ejs` | Article page; receives `title`, `subtitle`, `header`, `content`, `footer` |

The `header` and `footer` variables on the article template are HTML strings produced by plugins that subscribe to the `RenderArticleHeader` and `RenderArticleFooter` events. Any content injected by plugins is rendered into those slots.

The default templates use [Bulma](https://bulma.io) for styling.

---

## Running the server

**For production**, Docker is the recommended way to run Nodebook — see [Deploying with Docker](#deploying-with-docker) for full instructions.

**For local development**, use the watch mode which recompiles TypeScript and restarts the server on every change:

```bash
npm run dev
```

The server starts on `http://localhost:3001`. For full development setup and build instructions, see [DEVELOPMENT.md](DEVELOPMENT.md).

---

## Plugin system

Plugins extend Nodebook by hooking into named render events. Two events are available:

| Event | Payload | Injection point |
|---|---|---|
| `Events.RenderArticleHeader` | `Article` | Above article content |
| `Events.RenderArticleFooter` | `Article` | Below article content |

Handlers receive the fully-parsed `Article` object and return an HTML string that is injected into the template. A `reading-time` plugin is included as a working example.

For a guide to writing and registering your own plugins, see [DEVELOPMENT.md](DEVELOPMENT.md#plugin-system).

---

## Deploying with Docker

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/) on your server
- A domain name pointed at your server's IP (required for HTTPS)

### Quick start — local content

The simplest way to run Nodebook in Docker uses a local `content/` directory for your articles and templates:

```bash
# 1. Create your content directory
mkdir -p content/articles

# 2. Add your Markdown articles
cp your-article.md content/articles/

# 3. Build and start
docker compose up -d --build
```

The server starts on port `3001`. Default templates are seeded into `content/templates/` automatically on first run. To customise the templates, edit the files in `content/templates/` — they take effect on the next request.

### Environment variables

Copy `.env.example` to `.env` and adjust as needed:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `HOST_PORT` | `3001` | Host port to expose |
| `GIT_REPO` | — | SSH URL of your private fork (production only) |
| `GIT_BRANCH` | `main` | Branch to sync from (production only) |
| `SYNC_INTERVAL` | `60` | Seconds between git syncs (production only) |
| `SSH_KEY_PATH` | `./deploy_key` | Path to SSH deploy key on the host (production only) |

### Production deployment — automatic sync from a private fork

For a production blog, fork this repository as a private repo, write your articles and customise templates in the fork, and use the git-sync sidecar to propagate changes to the container automatically — no image rebuild required.

**1. Fork this repository as a private GitHub repo.**

**2. Generate an SSH deploy key:**

```bash
ssh-keygen -t ed25519 -C "nodebook-deploy-key" -f ./deploy_key -N ""
```

**3. Add the public key to your fork as a read-only Deploy Key:**

GitHub fork → Settings → Deploy keys → Add deploy key → paste `deploy_key.pub`.

**4. Update `Caddyfile` with your domain** (see [HTTPS with Caddy](#https-with-caddy)).

**5. Configure `.env` on the server:**

```bash
cp .env.example .env
# Edit .env — set GIT_REPO to your fork's SSH URL and SSH_KEY_PATH to the key location
```

**6. Deploy using `docker-compose.production.yml`**, which includes the nodebook app, git-sync sidecar, and Caddy reverse proxy:

```bash
# Upload your deploy key to the server
scp ./deploy_key user@your-server:/path/to/nodebook/deploy_key

# On the server
docker compose -f docker-compose.production.yml up -d --build
```

**7. Verify:**

```bash
docker compose -f docker-compose.production.yml logs -f git-sync   # should show clone + sync messages
curl https://yourdomain.com/                                        # HTTPS served via Caddy
```

After this, push any article or template change to your fork and it will appear on the site within `SYNC_INTERVAL` seconds.

### HTTPS with Caddy

The included `Caddyfile` configures [Caddy](https://caddyserver.com) as a reverse proxy. Caddy automatically obtains and renews a TLS certificate from Let's Encrypt — no manual certificate management needed.

Edit `Caddyfile` and replace `yourdomain.com` with your actual domain:

```
yourdomain.com {
    reverse_proxy nodebook:3001
}
```

Requirements: your domain's DNS A record must point to the server, and ports 80 and 443 must be reachable from the internet.
