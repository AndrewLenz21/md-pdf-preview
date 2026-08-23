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
2. **Server** — a Go binary (Echo) that provides the workspace API, PostgreSQL persistence, and Cloudflare R2 presigned URLs. It runs anywhere Go runs (VPS, Docker, Railway, Fly.io, etc.).

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

### Build

```bash
npm install
npm run build --filter=client
```

The Next.js output is produced by `apps/client/.next` (or `out/` if using static export).

### Deploy (Cloudflare)

1. Create a **Workers & Pages** project and connect the GitHub repository.
2. Set the production branch to `main`.
3. Configure the environment variables below in the Cloudflare dashboard (or a `.dev.vars` file for local `wrangler dev`).
4. Deploy.

> **Note:** The client's API routes use the Node.js runtime (`runtime = "nodejs"`). Make sure your Cloudflare configuration supports Node.js compatibility, or deploy the API routes to a Node-compatible host (e.g., Vercel) and serve the rest from Cloudflare.

## Deploying the server

### From source

```bash
cd apps/server
go build -o server .
```

### With Docker

```bash
# Build the image
docker build -t md-pdf-preview-server apps/server

# Run it
docker run -d \
  --env-file apps/server/.env \
  -p 8080:8080 \
  md-pdf-preview-server
```

> **Note:** A `Dockerfile` for the server is planned — until it lands, use `go build` and run the binary directly.

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

```bash
npm run build --filter=client
npm run start --filter=client
```

## Redeploy

1. Push to the `main` branch (GitHub push triggers auto-deploy via the connected Git integration), or
2. Go to **Cloudflare Dashboard → Workers & Pages → <your-project> → Deployments** and click **Create Deployment**.

For the server, rebuild and restart the binary/container with the new version.