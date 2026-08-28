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

1. **Client** — a Next.js 16 app (App Router) with server API routes (Hono), adapted for **Cloudflare Workers** by OpenNext. The dashboard works in local-only mode with no backend at all; cloud sync requires the server.
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
npm run preview:client      # build with OpenNext and preview in the Workers runtime
npm run deploy:client       # build with OpenNext and deploy to Cloudflare
```

The standard Next.js output is produced by `apps/client/.next`. OpenNext converts
it into the Worker output in `apps/client/.open-next`; neither directory is
committed.

### Deploy (Cloudflare)

The client is deployed as a **Cloudflare Worker** using OpenNext and Wrangler,
not as a static Pages site. Before the first deployment:

1. Install dependencies with `npm install`.
2. Authenticate Wrangler with `npx wrangler login`.
3. Configure the client variables in **Workers & Pages → md-pdf-preview → Settings → Variables and Secrets**.
4. Deploy with `npm run deploy:client`.

The deploy script passes `--keep-vars` to preserve the values configured in the
Cloudflare dashboard. Configure the connected Cloudflare Worker with these
Workers Builds settings:

| Setting | Value |
| ------- | ----- |
| Root directory | `/apps/client` |
| Production branch | `main` |
| Preview branches | Disabled |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |

The repository uses `main` as its production branch and `develop` for
development. There is no Git branch named `production`; in Cloudflare,
configure only the production deployment for `main`.

The commands above are compatible with the current package scripts. `npm run
build` runs the normal Next.js build, while `npm run deploy` runs the OpenNext
build and deployment. This means Workers Builds performs the Next.js build once
before the deploy script builds the Cloudflare bundle, which is expected but
not optimal.

For the more efficient OpenNext-native Workers Builds configuration, use these
commands instead:

```text
Build command:  npx @opennextjs/cloudflare build
Deploy command: npx @opennextjs/cloudflare deploy -- --keep-vars
```

Workers Builds needs the client variables in both **Build variables and secrets**
(for `NEXT_PUBLIC_*` values and static generation) and **Runtime variables**.

For local Worker preview, copy `apps/client/.dev.vars.example` to
`apps/client/.dev.vars` with PowerShell and keep the application values in the
ignored `apps/client/.env.local` file:

```powershell
Copy-Item apps/client/.dev.vars.example apps/client/.dev.vars
```

The `wrangler.jsonc` file enables the `nodejs_compat` compatibility flag needed
by Next.js, Better Auth, and the PostgreSQL client. The Worker name can be
changed in `apps/client/wrangler.jsonc` before the first deploy; update its
`WORKER_SELF_REFERENCE` service binding to the same name.

## Deploying the server

### Dokploy (Docker)

Deploy the Go server as a separate Dokploy application. This configuration builds
only `apps/server`; it does not build or host the Next.js client on the VM.

| Dokploy field       | Production value |
| ------------------- | ---------------- |
| Build Path          | `/apps/server`   |
| Branch              | `main`           |
| Trigger Type        | `On Push`        |
| Build Type          | `Dockerfile`     |
| Docker File         | `Dockerfile`     |
| Docker context path | `/apps/server`   |

The Dockerfile is relative to the build context. It compiles the Go binary and
runs it as a non-root user. Its `.dockerignore` excludes `.env` files, so set
the server variables in Dokploy's environment and secrets UI instead of copying
an environment file into the image.

For the `main` branch, set `APP_ENV=prod`. Configure Dokploy's domain to forward
to container port `8080`, then use that HTTPS URL as the client's `BACKEND_URL`.
`INTERNAL_API_KEY` must match the value configured for the Cloudflare Worker.

`GET /health` is protected by the server's `X-Api-Key` middleware. Do not use it
as an unauthenticated Dokploy HTTP health check unless the check can send that
header.

### From source

```powershell
Set-Location apps/server
go build -o build\server.exe .
Set-Location ../..
```

Run the generated `apps/server/build/server.exe` from PowerShell after configuring
`apps/server/.env`.

### Configuration

For local development, the server reads a `.env` file from its working directory
(see `apps/server/.env.example`). Create the PostgreSQL schema by running the
migrations in `apps/server/src/config/postgres/migrations/` (they run
automatically at startup).

## Database & storage

- **PostgreSQL** — use any provider: Supabase, Neon, Railway, or self-hosted. Set `DATABASE_URL` and `DB_SCHEMA`.
- **Cloudflare R2** — create a bucket and an API token with read/write permissions. The server generates presigned URLs; documents are uploaded directly by the client to R2.

### PostgreSQL application role

Use a dedicated PostgreSQL login for the application instead of a Supabase owner,
`postgres`, or another administrative role. This is fundamental when the client
connects through Hyperdrive: the Worker and Better Auth need only the permissions
to read and write the application's schema, not to administer the database.

Run the following as a database administrator, replacing `<DB_SCHEMA>` with the
configured PostgreSQL schema name and the password with a unique generated
secret. Store the resulting connection string in Cloudflare and Dokploy secrets;
never commit it to an `.env` example or source file.

```sql
CREATE ROLE md_pdf_preview
WITH LOGIN
PASSWORD '<GENERATED_PASSWORD>';

GRANT USAGE ON SCHEMA <DB_SCHEMA> TO md_pdf_preview;

GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA <DB_SCHEMA>
TO md_pdf_preview;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA <DB_SCHEMA>
TO md_pdf_preview;

ALTER ROLE md_pdf_preview
SET search_path TO <DB_SCHEMA>, public;
```

Set `DB_SCHEMA` to the same schema name used above. The client also sets
`search_path` in its Hyperdrive connection string so each Worker connection
resolves Better Auth tables such as `verification` in the configured schema. The
role-level setting is a safe default for direct connections and other application
processes.

This role intentionally has no schema or DDL privileges. Apply migrations with
the schema owner or a separate migration role before running the application;
new tables and sequences also need equivalent grants before the application role
can use them.

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

`npm run start --workspace=client` starts the standard Next.js Node.js server;
use `npm run preview:client` to test the Cloudflare Workers runtime.

## Redeploy

Run `npm run deploy:client` to deploy the current branch manually. Workers Builds
can run the documented OpenNext build and deploy commands after the repository is
connected to Cloudflare.

For the server, rebuild and restart the binary with the new version.
