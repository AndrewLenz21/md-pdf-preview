# Roadmap

## ✅ Completed

- **Markdown parsing engine** — block model, GFM support (tables, task lists, code), callouts (`<aside>`), escaped-emphasis normalization
- **Pagination engine** — block measurement + per-type strategies (paragraph, list, code, blank space) that predict exact page breaks
- **Paper-accurate preview** — A4, A5, Letter, Legal with real margins, footers, and block gaps; zoom support
- **Page-break markers** — synchronized with editor scroll on desktop and mobile
- **Three editing modes** — Markdown source, WYSIWYG document (TipTap), paper preview
- **Print mode** — browser print output matches the preview page-for-page
- **Document workspaces** — folders and documents with drag-and-drop, rename, move, delete, per-folder icons and colors
- **Local-first persistence** — IndexedDB workspace with write queue, migrations, and seed data
- **Cloud scaffolding** — Go/Echo backend, PostgreSQL migrations, Cloudflare R2 presigned URLs, API-key middleware, rate limiting, request logging
- **Cloud workspace** — document persistence and transfer between local and cloud
- **Authentication** — better-auth email/password sign up and sign in
- **Internationalization** — English, Spanish, and Italian
- **Themes** — dark and light with transition support
- **Responsive design** — desktop split view, mobile bottom navigation
- **Accessibility** — keyboard-resizable sidebar, ARIA-labeled controls

## 🚧 In Progress

- **Workspace session polish** — session state, source switching, and transfer edge cases
- **Cloud integration tests** — end-to-end coverage for the Hono workspace proxy
- **Preview toolbar refinements** — responsive layout for document/preview modes

## 📋 Planned

- **Direct PDF export** — generate a PDF file without the browser print dialog (client- and/or server-side)
- **Custom paper sizes and margins** — user-defined page dimensions
- **Markdown import/export** — import and export `.md` files from the filesystem
- **Keyboard shortcuts** — power-user navigation and formatting
- **Table pagination improvements** — header repetition and column-aware page breaks
- **More locales** — French, German, Portuguese, and more
- **Print theme polish** — dedicated light print styles for dark mode

## 🔮 Future Ideas

- **Real-time collaboration** — multi-user editing with presence
- **Document templates** — resumés, reports, letters, and other common formats
- **Desktop wrapper** — Tauri or Electron for an offline-native experience
- **Plugin system** — community extensions for block types and output formats
- **Version history** — document revisions with restore
- **Additional locales** — full coverage for any language the community wants

---

## 💡 How to Influence the Roadmap

Open issues and upvote existing ones to signal what matters most. We prioritize based on:

1. **Community demand** (reactions and comments on issues)
2. **Architectural impact** (features that unlock future work)
3. **Maintainability** (features we can sustain long-term)

We welcome PRs for anything on this roadmap — see [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.