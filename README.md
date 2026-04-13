# Nodebook

A lightweight, file-based blog engine for Node.js. Write articles in Markdown, drop them in a folder, and Nodebook serves them as a styled website. Extend behaviour through a typed plugin system without touching core code.

## Table of Contents

- [How it works](#how-it-works)
- [Requirements](#requirements)
- [Installation](#installation)
- [Writing articles](#writing-articles)
  - [Frontmatter fields](#frontmatter-fields)
  - [Article visibility](#article-visibility)
  - [Preview mode](#preview-mode)
- [Configuration](#configuration)
- [Templates](#templates)
- [Running the server](#running-the-server)
- [Plugin system](#plugin-system)
  - [Available events](#available-events)
  - [Writing a plugin](#writing-a-plugin)
  - [Registering a plugin](#registering-a-plugin)
- [Project structure](#project-structure)
- [Development](#development)
  - [Scripts](#scripts)
  - [Architecture](#architecture)
  - [Adding a service implementation](#adding-a-service-implementation)
  - [Testing](#testing)

---

## How it works

Nodebook reads `.md` files from an `articles/` directory, parses their YAML frontmatter and Markdown body, and renders them using EJS templates. A small [Polka](https://github.com/lukeed/polka) HTTP server handles routing:

- `/` — index page listing all visible articles, sorted by date descending
- `/:id` — individual article page
- `/:id/preview` — article page bypassing visibility rules (useful during drafting)
- Any other path that matches a file on disk is served as a static asset

---

## Requirements

- Node.js 20+
- npm 10+
- [pnpm](https://pnpm.io) (for workspace support)

Install pnpm if you don't have it:

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

---

## Installation

```bash
git clone https://github.com/jay-allan/nodebook.git
cd nodebook
pnpm install
npm run build
```

---

## Writing articles

Articles are Markdown files stored in the `articles/` directory at the project root (or wherever `BASE_PATH` points — see [Configuration](#configuration)). The filename (without `.md`) becomes the article's URL slug.

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
| `NODE_ENV` | — | Set to `production` to silence the logger and suppress console output |

When running in development, set `BASE_PATH` to the project root so the server picks up your source `articles/` and `templates/` directories directly:

```bash
BASE_PATH=. npm run dev
```

The server listens on port **3001**.

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

## Plugin system

Plugins extend Nodebook by registering handlers on named events. When an event is dispatched (e.g., when an article page is rendered), each registered handler runs and its return value is collected. The collected strings are concatenated and injected into the template.

### Available events

| Event | Payload | Injection point |
|---|---|---|
| `Events.RenderArticleHeader` | `Article` | Above article content |
| `Events.RenderArticleFooter` | `Article` | Below article content |

Handlers receive the fully-parsed `Article` object (including `parsedContent` — the rendered HTML) and return an HTML string to inject into the page.

### Writing a plugin

Create a new directory under `plugins/` and implement the `IPlugin` interface:

```typescript
// plugins/my-plugin/src/plugin.ts
import type { IPlugin, IEventRegistrar } from '../../../src/IPlugin';
import type { Article } from '../../../src/Articles/IArticleService';

class MyPlugin implements IPlugin {
    name = 'my-plugin';
    version = '0.1';
    description = 'Does something useful';

    async initialize(registrar: IEventRegistrar): Promise<void> {
        registrar.register(
            'EVENT_RENDER_ARTICLE_FOOTER',
            this.handleFooter.bind(this)
        );
    }

    private handleFooter(article: Article): string {
        return `<p>Published: ${article.date.toDateString()}</p>`;
    }
}

export default MyPlugin;
```

Add a `package.json` and `tsconfig.json` matching the pattern in `plugins/reading-time/`, then build with `tsc -b` from the plugin directory. The compiled output goes to `dist/plugins/<plugin-name>/plugin.js`, which is where `PluginLoader` looks at startup.

### Registering a plugin

Plugins are discovered automatically — `PluginLoader` scans `dist/plugins/` at startup and calls `initialize` on each one. No manual registration is required; just build the plugin and restart the server.

---

## Project structure

```
nodebook/
├── articles/               # Markdown article files (content)
├── templates/              # EJS templates
│   ├── header.ejs
│   ├── footer.ejs
│   ├── index.ejs
│   └── article.ejs
├── plugins/                # pnpm workspace packages
│   └── reading-time/       # Bundled example plugin
├── src/                    # Application source
│   ├── app.ts              # Entry point — server setup and routing
│   ├── AppSettings.ts      # Environment-based configuration
│   ├── Articles/           # Article loading and data model
│   ├── Core/               # EventBus and EventDispatcher
│   ├── Events/             # EventChannel singleton and event names
│   ├── Parsing/            # Markdown parser service
│   ├── Rendering/          # EJS template renderer service
│   ├── IPlugin.ts          # IPlugin and IEventRegistrar interfaces
│   ├── IHttpResponseController.ts
│   ├── PluginLoader.ts     # Dynamic plugin discovery and loading
│   └── Logger.ts           # Winston-backed logger
├── dist/                   # Compiled output (generated)
├── eslint.config.js
├── jest.config.js
├── tsconfig.json           # Root — references src and plugins
└── pnpm-workspace.yaml
```

---

## Development

### Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `BASE_PATH=. concurrently "tsc --build --watch" "nodemon dist/app.js"` | Watch mode — recompiles on change and restarts the server |
| `build` | `tsc --build` | Full TypeScript build (all project references) |
| `test` | `jest src plugins --passWithNoTests` | Run all tests |
| `lint` | `eslint ./src` | Lint source files |
| `format` | `prettier ... --write` | Format source files |
| `docs` | `typedoc` | Generate API docs into `docs/` |

### Architecture

Nodebook follows SOLID principles with service interfaces at every layer, making each piece independently replaceable.

```
app.ts
  └── PluginLoader          loads IPlugin implementations at startup
  └── IndexPageController   handles GET /
        └── IArticleService       reads and filters articles
        └── ITemplateRenderService renders the index template
  └── ArticlePageController handles GET /:id
        └── IArticleService
        └── IContentParserService  converts Markdown to HTML
        └── ITemplateRenderService renders the article template
        └── EventChannel    dispatches RenderArticleHeader / RenderArticleFooter
```

**Event system:** `EventBus` is a generic, in-process pub/sub bus. `EventChannel` is a singleton wrapper that ties the bus to the named `Events` enum. Handlers are typed — `register<T>(event, handler: (payload: T) => string)` — with the `unknown`-to-T widening happening once inside `EventBus`, not at call sites.

**Plugin loading:** `PluginLoader` scans `dist/plugins/` for subdirectories containing a `plugin.js`, dynamically imports each one, instantiates the default export, and calls `initialize` with an `IEventRegistrar` bound to the live `EventChannel`.

### Adding a service implementation

Each core concern is behind an interface:

| Interface | Default implementation |
|---|---|
| `IArticleService` | `ArticleFileService` — reads `.md` files from disk |
| `IContentParserService` | `MarkdownParserService` — uses `marked` with `highlight.js` |
| `ITemplateRenderService` | `EjsTemplateRenderService` — renders EJS templates |

To swap in a different implementation (e.g., a database-backed article store), implement the relevant interface and update the construction in `app.ts`.

### Testing

Tests live alongside source files (`*.test.ts`) and are excluded from compilation output. Run them with:

```bash
npm test
```

The suite uses [Jest](https://jestjs.io) with `ts-jest` for TypeScript support. Tests are configured to use `src/tsconfig.json` so they share the same compiler settings as production code.
