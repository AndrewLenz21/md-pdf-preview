# Deployment Guide

> md-pdf-preview — client on Cloudflare, Go backend on your own host.

## Table of Contents

- [Overview](#overview)
- [Repository](#repository)
- [Architecture](#architecture)
- [Deploying the client](#deploying-the-client)
- [Deploying the server](#deploying-the-server)
- [Database & storage](#database--storage)
- [Environment variables](#environment-variables)
- [Domain](#domain)
- [Local preview](#local-preview)
- [Redeploy](#redeploy)

## Overview

The project has two deployable pieces:

1. **Client** — a Next.js 16 app (App Router) with server API routes (Hono). Deployed to **Cloudflare**. The dashboard works in local-only mode with no backend at all; cloud sync requires the server.
2. **Server** — a Go binary (Echo) that provides the workspace API, PostgreSQL persistence, and Cloudflare R2 presigned URLs.

The development and deployment instructions in this repository target **Windows 10/11 with PowerShell**. The npm scripts for the Go server use Windows command syntax.

## Repository

| Detail | Value |
| ------ | ----- |
| Provider | GitHub |
| URL | `https://github.com/AndrewLenz21/md-pdf-preview` |
| Production branch | `main` |

## Architecture

```
Browser ──► Cloudflare (Next.js client, /api Hono routes)
                 │
                 │ internal proxy (X-Api-Key + X-User-Id)
                 ▼
            Go server (Echo)
                 │
        ┌────────┴────────┐
        ▼                 ▼
   PostgreSQL        Cloudflare R2
   (workspace items) (document contents)
```

The client never talks to PostgreSQL or R2 directly. All cloud requests flow through the Go server, which validates the user identity forwarded by the client proxy.

## Deploying the client

### Commands

Run these commands from the repository root:

```powershell
# Development
npm run dev                 # client + server
npm run dev:client          # client only
npm run dev:server          # server only

# Builds
npm run build               # client + server
npm run build:client        # client only
npm run build:server        # server only

# Cloudflare Worker
npm run preview:client      # build and preview with workerd
npm run deploy:client       # build and deploy with Wrangler
```

The regular Next.js output is produced by `apps/client/.next`. The Cloudflare
deployment output is produced by `apps/client/.open-next` and is not committed.

### Deploy (Cloudflare)

The client is deployed as a **Cloudflare Worker** using OpenNext and Wrangler,
not as a static Pages site. Before the first deployment:

1. Install dependencies with `npm install`.
2. Authenticate Wrangler with `npx wrangler login`.
3. Configure the client variables in **Workers & Pages → md-pdf-preview-client → Settings → Variables and Secrets**.
4. Deploy with `npm run deploy:client`.

For local Worker preview, copy `apps/client/.dev.vars.example` to
`apps/client/.dev.vars` with PowerShell and keep the application values in the
ignored `apps/client/.env.local` file:

```powershell
Copy-Item apps/client/.dev.vars.example apps/client/.dev.vars
```

The `wrangler.jsonc` file enables the `nodejs_compat` compatibility flag needed
by the Next.js API routes. The Worker name can be changed in
`apps/client/wrangler.jsonc` before the first deploy.

> **Windows:** OpenNext reports that Windows is not its primary supported build
> environment. If the local build behaves inconsistently, run the same commands
> from WSL or the Cloudflare Workers Build pipeline.

## Deploying the server

### From source

```powershell
Set-Location apps/server
go build -o build\server.exe .
Set-Location ../..
```

Run the generated `apps/server/build/server.exe` from PowerShell after configuring
`apps/server/.env`.

### Configuration

The server reads a `.env` file from its working directory (see `apps/server/.env.example`). Create the PostgreSQL schema by running the migrations in `apps/server/src/config/postgres/migrations/` (they run automatically at startup).

## Database & storage

- **PostgreSQL** — use any provider: Supabase, Neon, Railway, or self-hosted. Set `DATABASE_URL` and `DB_SCHEMA`.
- **Cloudflare R2** — create a bucket and an API token with read/write permissions. The server generates presigned URLs; documents are uploaded directly by the client to R2.

## Environment variables

### Client (`apps/client/.env.example`)

| Variable | Description |
| -------- | ----------- |
| `DATABASE_URL` | PostgreSQL connection string (used by better-auth) |
| `DB_SCHEMA` | PostgreSQL schema name |
| `BETTER_AUTH_SECRET` | Random secret, at least 32 characters |
| `BETTER_AUTH_URL` | Public URL of the client (e.g., `https://yourdomain.com`) |
| `BACKEND_URL` | Internal URL of the Go server |
| `INTERNAL_API_KEY` | Shared secret between client and server (must match) |

### Server (`apps/server/.env.example`)

| Variable | Description |
| -------- | ----------- |
| `DATABASE_URL` | PostgreSQL connection string |
| `DB_SCHEMA` | PostgreSQL schema name |
| `SERVER_PORT` | Port (default `8080`) |
| `INTERNAL_API_KEY` | Must match the client's value |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 API credentials |
| `R2_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `R2_BUCKET_NAME` | R2 bucket name |
| `ERROR_LOGGING_*` | Error logger queue settings |

> **Important:** The client sends `cf-connecting-ip` to the server for rate limiting. Only rely on this header when Cloudflare actually sits in front of the Next.js origin — otherwise callers could spoof it. When deploying, explicitly configure better-auth `trustedOrigins` with your production origins.

## Domain

**Production URL:** [INSERT DEMO URL — e.g., https://md-pdf-preview.andrew-lenz.com]

### Adding a custom domain

1. Go to **Cloudflare Dashboard → Workers & Pages → <your-project>**.
2. Open the **Domains** tab.
3. Click **Add Domain** and enter the domain.
4. Cloudflare automatically provisions the DNS record and HTTPS certificate.

> **Important:** Do NOT add the domain as a new Cloudflare zone. The domain is managed through the project's Domains section, not through a separate zone configuration.

## Local preview

Test the production build locally before deploying:

```powershell
npm run preview:client
```

`npm run start --workspace=client` still runs the standard Next.js server when a
Node.js production preview is preferred.

## Redeploy

1. Push to the `main` branch (GitHub push triggers auto-deploy via the connected Git integration), or
2. Go to **Cloudflare Dashboard → Workers & Pages → <your-project> → Deployments** and click **Create Deployment**.

For the server, rebuild and restart the binary with the new version.
