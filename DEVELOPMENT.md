# Nodebook — Development Guide

This document covers everything you need to know to work on Nodebook itself: project structure, architecture, scripts, writing plugins, and running tests.

For end-user documentation (writing articles, configuration, deploying), see [README.md](README.md).

---

## Table of Contents

- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Architecture](#architecture)
  - [Adding a service implementation](#adding-a-service-implementation)
- [Plugin system](#plugin-system)
  - [Writing a plugin](#writing-a-plugin)
  - [Registering a plugin](#registering-a-plugin)
- [Testing](#testing)

---

## Requirements

- Node.js 20+
- npm 10+
- [pnpm](https://pnpm.io) (for workspace support)
- [Docker](https://docs.docker.com/get-docker/) 24+ and [Docker Compose](https://docs.docker.com/compose/install/) v2 (for container testing and production deployment)

Install pnpm if you don't have it:

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

---

## Getting started

```bash
git clone https://github.com/jay-allan/nodebook.git
cd nodebook
pnpm install
npm run build
```

Start the development server (watches for TypeScript changes and restarts automatically):

```bash
npm run dev
```

The server starts on `http://localhost:3001`.

---

## Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `BASE_PATH=. concurrently "tsc --build --watch" "nodemon dist/app.js"` | Watch mode — recompiles on change and restarts the server |
| `build` | `tsc --build` | Full TypeScript build (all project references) |
| `test` | `jest src plugins --passWithNoTests` | Run all tests |
| `lint` | `eslint ./src` | Lint source files |
| `format` | `prettier ... --write` | Format source files |
| `docs` | `typedoc` | Generate API docs into `docs/` |

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
├── scripts/
│   └── git-sync.sh         # git-sync sidecar script (production deployment)
├── Dockerfile
├── docker-compose.yml
├── Caddyfile
├── entrypoint.sh
└── pnpm-workspace.yaml
```

---

## Architecture

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

## Testing

See [TESTING.md](TESTING.md) for the full testing guide, covering the TypeScript build and unit tests through to verifying the full production stack on a live VPS.
