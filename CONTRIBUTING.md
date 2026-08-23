# Contributing to md-pdf-preview

First off, thank you for considering contributing. This project exists because "how will my Markdown look on paper?" is a question nobody answered well — and the answer lives here, in the pagination engine.

## 💭 Project Philosophy

- **Fidelity first.** The preview must tell the truth about the final print. If a page break is wrong, it's a bug — not a cosmetic detail.
- **Local-first.** Your documents should work without accounts, servers, or subscriptions. The cloud is an optional convenience, never a requirement.
- **Small, focused PRs.** Small PRs are easier to review, safer to merge, and more likely to be accepted.
- **Tests are part of the feature.** The pagination logic is pure and testable — keep it that way.
- **Accessibility and i18n are features.** New UI must work with keyboard navigation and ship with translations for all supported locales.

## 🏗️ Architecture Overview

This is a **Turborepo monorepo** with npm workspaces:

```
apps/
├── client/                 # Next.js 16 (App Router), React 19, TypeScript
│   └── src/
│       ├── app/            # Routes: landing, auth, dashboard, /api (Hono)
│       ├── core/           # App-wide infrastructure (auth, i18n, themes)
│       ├── modules/        # Feature modules — each self-contained
│       │   ├── auth/       # Sign in / sign up
│       │   ├── navigation/ # Navbar, selectors, mobile drawer
│       │   └── dashboard/  # Document model, parser, editor, preview, pagination
│       ├── shared/         # Reusable hooks, dialogs, preferences
│       └── lib/            # Backend proxy client, auth client
└── server/                 # Go 1.25 + Echo v4
    └── src/
        ├── config/         # Environment, Postgres, R2, middlewares, migrations
        ├── controllers/    # HTTP handlers (health, workspace)
        ├── models/         # Domain models
        ├── repositories/   # PostgreSQL data access
        └── services/       # Business logic, Cloudflare R2, logging
packages/
├── ui/                     # Shared React components
├── eslint-config/          # Shared ESLint configs
└── typescript-config/      # Shared tsconfigs
```

The client follows a **vertical-slice modular architecture**: each module in `src/modules/` owns its components, hooks, stores, and types, and exposes a barrel export (`index.ts`).

The pagination engine lives in `apps/client/src/modules/dashboard/preview/components/paper-preview/pagination/` — one strategy per block type (paragraph, list, code, blank space), all pure functions operating on measured block data.

## 🛠️ Development Setup

### 📋 Prerequisites

- **Node.js** >= 18, **npm** 11+
- **Go** 1.25+ (backend only)
- [**air**](https://github.com/air-verse/air) for backend hot-reload (backend only)

### 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/AndrewLenz21/md-pdf-preview.git
cd md-pdf-preview

# Install dependencies
npm install

# Configure the client
cp apps/client/.env.example apps/client/.env.local

# Run the client (local workspace, no backend needed)
npm run dev --filter=client
# Open http://localhost:3000

# For the full stack, also configure and run the server
cp apps/server/.env.example apps/server/.env
npm run dev
```

### 🧪 Running Tests

```bash
# Client (Vitest)
npm run test --filter=client

# Server (Go tests)
npm run check-types --filter=server

# Lint + types everywhere
npm run lint
npm run check-types
```

## 📐 Coding Standards

### 📘 TypeScript (client)

- Strict mode is enabled. Avoid `any` — prefer `unknown` and type narrowing.
- Barrel exports (`index.ts`) in every module.
- Path aliases are configured (`@/` → `apps/client/src`).
- Pure logic (parsing, measurement, pagination) must live in plain functions — no React — so it stays unit-testable.

### ⚛️ React Components

- Prefer function components with hooks.
- Components that read state use Zustand stores; components that render blocks use the typed document model.
- Keep components focused; if a file exceeds ~300 lines, consider splitting.

### 🗄️ State Management

- **Zustand** for all client state.
- **IndexedDB** for local workspace persistence (`local-workspace.repository.ts`).
- Stores expose `hydrate()` for initialization on mount.

### 🐹 Go (server)

- Follow `go vet` and `gofmt` output.
- Controllers stay thin; business logic lives in services; data access in repositories.
- Every middleware and controller gets a test.

### 🎨 Styling

- **Tailwind CSS v4** with the project's design tokens (background, foreground, border, muted, etc.).
- Prefer tokens over hardcoded colors.

### 🌐 i18n

- Each module has its own `messages/{locale}.json` (en, es, it).
- English (`en`) is the default locale and serves as fallback.
- When adding a locale, provide a complete translation file for every module.

### 📁 File Naming

- **Components**: PascalCase (e.g., `PaperPreview.tsx`)
- **Utilities/Services**: camelCase (e.g., `paginateDocument.ts`)
- **Stores**: kebab-case with `.store.ts` suffix (e.g., `workspace-items.store.ts`)
- **Types**: camelCase with `.types.ts` suffix (e.g., `paper.types.ts`)
- **Tests**: match the source file name (e.g., `listPagination.test.ts`)

## 🌿 Branch Naming

```
feat/paper-size-custom
fix/code-pagination-line-wrap
refactor/pagination-strategies
docs/preview-architecture
i18n/fr-translations
```

Prefixes: `feat/`, `fix/`, `refactor/`, `docs/`, `i18n/`, `test/`, `chore/`.

## 💬 Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(preview): add custom paper size support
fix(pagination): keep code blocks intact across page breaks
refactor(measurement): extract shared block measurement utility
i18n(navigation): add French translations
test(pagination): add edge cases for list wrapping
```

Types: `feat`, `fix`, `refactor`, `i18n`, `test`, `docs`, `chore`, `style`, `perf`.

## 🔄 Pull Request Process

1. **Open an issue first** for non-trivial changes and discuss the approach.
2. **Keep PRs small and focused.** One PR, one concern.
3. **Write or update tests.** Untested pagination logic will be treated as incomplete — this is the core value of the project.
4. **Run lint and type checks**: `npm run lint && npm run check-types`.
5. **Verify the client tests pass**: `npm run test --filter=client`.
6. **Update documentation** if you change public APIs or the architecture.
7. **Request review** from at least one maintainer.

## 👀 Code Review Expectations

- Reviewers look for correctness, test coverage, adherence to existing patterns, and documentation.
- Reviews focus on substance; nitpicks about style are welcome but secondary.
- All review discussions should be respectful and constructive.

## 🧠 Working on the Pagination Engine

The pagination engine predicts where pages break by combining:

1. **Block measurement** — real DOM measurements of rendered blocks (paragraphs, lists, code, callouts, blank space) at the current paper size and zoom.
2. **Pure pagination strategies** — per-block-type algorithms that decide how blocks split across pages.
3. **Page-break markers** — synced with the editor scroll so you see exactly where each break lands.

If you change how a block renders, run the pagination tests — a layout tweak can silently break page-break fidelity.

## 📝 Documentation Expectations

- **New features** must include inline documentation for non-obvious logic.
- **Architecture changes** should update this CONTRIBUTING.md.
- **README changes** should be proposed separately from feature PRs.

---

## 💡 Good First Contributions

- Add translations for a new locale (see the i18n section above).
- Add test coverage for pagination edge cases.
- Improve accessibility of dialogs and the preview toolbar.
- Documentation and screenshot polish.
- Ideas and bug reports are contributions too — open an issue!