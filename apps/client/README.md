# Client — md-pdf-preview

Next.js 16 (App Router) application: the editor, the paper-accurate preview, the document workspace, and the Hono API routes.

## ✨ What's Here

- **Markdown source editing** — raw Markdown with syntax-aware editing
- **WYSIWYG document editing** — TipTap 3 with tables, task lists, code blocks, and callouts
- **Paper preview** — the pagination engine measures every block and predicts exact page breaks for A4, A5, Letter, and Legal
- **Print mode** — browser print output matches the preview page-for-page
- **Document workspaces** — folders, drag-and-drop, rename, move, delete, icons, and colors
- **Local-first storage** — IndexedDB workspace that works without an account
- **Cloud sync (optional)** — better-auth sign in and workspace persistence through the Go backend
- **i18n** — English, Spanish, and Italian (next-intl)
- **Themes** — dark and light (next-themes)

## 🧱 Stack

| Layer | Technology |
| ----- | ---------- |
| Framework | Next.js 16 (App Router), React 19 |
| Editor | TipTap 3 |
| Markdown | unified + remark-gfm (parse), turndown (serialize) |
| State | Zustand + IndexedDB |
| API routes | Hono (`/api/auth/*`, `/api/workspace/*`) |
| Auth | better-auth (email/password) |
| Styling | Tailwind CSS v4 |
| Tests | Vitest + Testing Library |

## 🚀 Getting Started

```bash
# From the repo root
npm install

# Configure environment variables
cp .env.example .env.local

# Start the client
npm run dev --filter=client
```

Open [http://localhost:3000](http://localhost:3000).

Without a backend, the app runs in **local-only mode**: documents are stored in IndexedDB and cloud features report the backend as unavailable.

## 📂 Structure

```
src/
├── app/
│   ├── [locale]/           # Landing, auth, dashboard pages (i18n routing)
│   └── api/[[...route]]/   # Hono routes: auth + workspace proxy
├── core/
│   ├── auth/               # Better Auth configuration
│   ├── i18n/               # next-intl routing, locale store
│   └── theme/              # Theme provider, app theme store
├── lib/
│   ├── auth-client.ts      # better-auth React client
│   └── backend/server.ts   # Server-only proxy to the Go backend
├── modules/
│   ├── auth/               # Sign in / sign up forms
│   ├── navigation/         # Navbar, language/theme selectors, mobile drawer
│   └── dashboard/          # The heart: editor, preview, pagination engine
│       ├── document/       # Block model, Markdown parser, serialization
│       ├── docs-sidebar/   # Folder tree, drag-and-drop, dialogs
│       ├── preview/        # Paper preview, measurement, pagination strategies
│       ├── stores/         # Workspace/editor stores, local & cloud persistence
│       └── services/       # workspace-api client
└── shared/                 # Hooks, dialogs, preference components
```

## 🧪 Tests

```bash
npm run test
```

Coverage focuses on the hard parts: Markdown parsing, TipTap ↔ Markdown conversion, pagination strategies, block measurement, stores, and persistence.

## 📡 API Routes

| Route | Description |
| ----- | ----------- |
| `/api/auth/*` | Better Auth handler |
| `/api/workspace/items` | List / create workspace items |
| `/api/workspace/items/:id` | Get / update / delete a workspace item |
| `/api/workspace/documents/:id/upload-url` | Get an R2 presigned upload URL |
| `/api/workspace/documents/:id/upload-complete` | Confirm a document upload |
| `/api/workspace/documents/:id/download-url` | Get an R2 presigned download URL |

All `/api/workspace/*` routes require a session and proxy to the Go backend with `X-Api-Key` and `X-User-Id` headers.

## 🔐 Authentication deployment

Better Auth reads the real client IP from Cloudflare's `cf-connecting-ip` header.
Only deploy this configuration when Cloudflare controls access to the Next.js
origin, otherwise callers could spoof that header.

Before production deployment, explicitly configure Better Auth `trustedOrigins`
with the production origins, for example:

```ts
trustedOrigins: [
  "https://yourdomain.com",
  "https://www.yourdomain.com",
  "http://localhost:3000",
];
```

This preserves Better Auth's origin and redirect URL validation. Do not add
placeholder production domains to the live configuration.

## 📄 License

MIT — see the repository root.