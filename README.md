# md-pdf-preview

Write once. Preview every page.

A calm place to shape your Markdown documents and see exactly how they will read when they leave the screen — with a pagination engine that predicts real page breaks before you print.

<p align="center">
  <a href="https://github.com/AndrewLenz21/md-pdf-preview" target="_blank">
    <strong>github.com/AndrewLenz21/md-pdf-preview</strong>
  </a>
</p>

<p align="center">
  <!--
    🖼️ IDEAL FOR AN IMAGE OR GIF — hero screenshot: editor + paper preview side by side
    Drop your file in docs/images/ and uncomment the line below:
    <img src="docs/images/hero.png" alt="Editor with live page-break preview" width="800" />
  -->
</p>

## ✨ Features

| Feature | Description |
| ------- | ----------- |
| **📄 Fidelity-first preview** | A pagination engine measures every block (paragraphs, lists, code, blank space) and predicts exact page breaks — no more "why does my PDF look different?". |
| **✍️ Three editing modes** | Markdown source, WYSIWYG document (TipTap), and paper preview. Switch freely, edits stay in sync. |
| **📐 Real paper sizes** | A4, A5, Letter, and Legal with accurate margins, footers, and block spacing. Zoom in and out. |
| **🖨️ Print-ready** | Browser print output matches the preview page-for-page. |
| **📊 Paper-accurate preview** | Paragraph, list, and code-block pagination strategies with page-break markers synced to the editor scroll. |
| **🗂️ Document workspaces** | Folders and documents with drag-and-drop, rename, move, delete, and per-folder icons and colors. |
| **💾 Local-first** | Documents persist in IndexedDB. Works fully without an account. |
| **☁️ Optional cloud sync** | Sign in and keep your workspace in the cloud (PostgreSQL + Cloudflare R2). |
| **🌐 i18n** | English, Spanish, and Italian. |
| **🎨 Themes** | Dark and light, with smooth transitions. |
| **📱 Responsive** | Split desktop view, bottom navigation on mobile. |
| **♿ Accessibility** | Keyboard-resizable sidebar, ARIA-labeled controls, focus-visible styles. |

## 🛠️ Tech Stack

| Layer | Technology |
| ----- | ---------- |
| 🚀 Client | [Next.js](https://nextjs.org) 16 (App Router), React 19, TypeScript |
| ✍️ Editor | [TipTap](https://tiptap.dev) 3 (WYSIWYG) + unified/remark for Markdown parsing |
| 🔄 Serialization | turndown + turndown-plugin-gfm |
| 🗄️ State | Zustand (stores) + IndexedDB (local workspace) |
| 🌐 i18n | next-intl (en, es, it) |
| 🎨 Styling | Tailwind CSS v4 |
| ⚙️ Server | Go 1.25, Echo v4 |
| 🗃️ Database | PostgreSQL (pgx) |
| ☁️ Storage | Cloudflare R2 (S3-compatible) |
| 🔐 Auth | better-auth (email/password) |
| 🧪 Tests | Vitest + Testing Library (client), Go tests (server) |

## 🏗️ Architecture

```
md-pdf-preview/
├── apps/
│   ├── client/               # Next.js 16 — editor, preview, dashboard, Hono API routes
│   └── server/               # Go/Echo — workspace API, PostgreSQL, R2, rate limiting
├── packages/
│   ├── ui/                   # Shared React components (Button, Card, Code)
│   ├── eslint-config/        # Shared ESLint configurations
│   └── typescript-config/    # Shared tsconfig presets
├── turbo.json                # Turborepo pipeline
└── package.json              # npm workspaces
```

### Client Module Overview

| Module | Responsibility |
| ------ | -------------- |
| `⚙️ core` | Auth (better-auth), i18n routing, theme providers |
| `🔐 auth` | Sign in / sign up flows |
| `🧭 navigation` | Navbar, language/theme selectors, mobile drawer |
| `📊 dashboard` | The heart: document model, Markdown parser, editor, paper preview, pagination engine |
| `📁 docs-sidebar` | Folder tree, drag-and-drop, rename/move/delete dialogs |
| `📄 document` | Markdown parsing (incl. callouts), serialization, block model |
| `📐 preview` | Paper preview, block measurement, pagination strategies, print mode |
| `🗄️ stores` | Workspace, editor, local/cloud persistence (Zustand + IndexedDB) |
| `📦 shared` | Reusable hooks, dialogs, preferences (theme/locale) |

### Server Overview

| Area | Responsibility |
| ---- | -------------- |
| `⚙️ config` | Environment, PostgreSQL pool, Cloudflare R2, rate limiter, API-key middleware |
| `🎮 controllers` | Health, workspace |
| `🗃️ repositories` | PostgreSQL data access for workspace items and request logs |
| `🧩 services` | Workspace business logic, Cloudflare R2 presigned URLs, structured logging |
| `🧪 migrations` | Bootstrap and schema migrations for Postgres |

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18 and **npm** 11+
- **Go** 1.25+ (only for the backend)
- [**air**](https://github.com/air-verse/air) (only for backend hot-reload)

### Quickstart — client only (local workspace)

The client works standalone: no database, no backend, no account. Documents live in your browser's IndexedDB.

```bash
# 1. Install dependencies (from the repo root)
npm install

# 2. Configure environment variables
cp apps/client/.env.example apps/client/.env.local

# 3. Start the client
npm run dev --filter=client
```

Open [http://localhost:3000](http://localhost:3000).

> **Note:** `BACKEND_URL` and `INTERNAL_API_KEY` are still required by the client's server-side proxy, but cloud features will simply report the backend as unavailable if it is not running.

### Full stack (cloud sync)

```bash
# 1. Start PostgreSQL (or use Supabase/Neon)

# 2. Configure the server
cp apps/server/.env.example apps/server/.env

# 3. Configure the client with matching values
cp apps/client/.env.example apps/client/.env.local

# 4. Run everything
npm run dev
```

- Client: [http://localhost:3000](http://localhost:3000)
- Server: [http://localhost:8080](http://localhost:8080)

### Useful commands

```bash
npm run dev             # Run all apps in development
npm run build           # Production build (all apps)
npm run lint            # ESLint + go vet
npm run check-types     # TypeScript + Go tests
npm run test --filter=client   # Vitest (client)
```

## 🧪 Testing

The project takes pagination seriously — and so does its test suite.

- **Client:** Vitest + Testing Library. Focus areas: Markdown parsing, TipTap ↔ Markdown conversion, pagination strategies (paragraph, list, code, blank space), measurement logic, stores, and persistence.
- **Server:** Go tests for controllers, services, repositories, and middlewares (rate limiter, API key, logger).

```bash
# Client tests
npm run test --filter=client

# Server tests
npm run check-types --filter=server
```

## 🖼️ Screenshots

<!--
  🖼️ IDEAL FOR AN IMAGE OR GIF — drop files in docs/images/ and uncomment:

  ![Editor mode](docs/images/editor.png)
  ![Paper preview with page breaks](docs/images/preview.png)
  ![Mobile preview](docs/images/mobile.png)
-->

## 🤝 Contributing

Contributions of all kinds are welcome — features, bug fixes, translations, docs. See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide.

## 🗺️ Roadmap

See [ROADMAP.md](./ROADMAP.md) for what's done, in progress, and planned.

## 🔒 Security

Found a vulnerability? See [SECURITY.md](./SECURITY.md) for our disclosure process.

## 📄 License

MIT

## 🤖 Built with AI

This project was developed with the assistance of [OpenCode](https://opencode.ai), an interactive CLI tool for software engineering tasks.

| Model | Role |
| ----- | ---- |
| 🏗️ GPT 5.6 Terra | Architecture decisions and code organization |
| 🧩 GPT 5.6 Luna | Module-level changes — one module at a time, without touching other areas |
| 🚀 DeepSeek V4 Flash | Deployment decisions and open source guidance |

All code was reviewed and tested before commit. Architecture decisions, data modelling, and final validation were human-led.