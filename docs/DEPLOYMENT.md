# Deployment Guide

> md-pdf-preview — Next.js Worker on Cloudflare and Go backend on an Oracle Cloud VM in Phoenix, United States.

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

1. **Client / edge** — a Next.js 16 app (App Router) with server API routes (Hono), deployed to **Cloudflare Workers** by OpenNext. Better Auth runs server-side in this Worker and accesses Supabase PostgreSQL through Cloudflare Hyperdrive. The dashboard works in local-only mode with no backend at all; cloud sync requires the server.
2. **Server** — a separate Go binary (Echo) on an Oracle Cloud VM in Phoenix, United States. Dokploy manages its deployment. It provides the workspace API, direct PostgreSQL persistence, and Cloudflare R2 presigned URLs.

The development and deployment instructions in this repository target **Windows 10/11 with PowerShell**. The npm scripts for the Go server use Windows command syntax.

## Repository

| Detail            | Value                                            |
| ----------------- | ------------------------------------------------ |
| Provider          | GitHub                                           |
| URL               | `https://github.com/AndrewLenz21/md-pdf-preview` |
| Production branch | `main`                                           |

## Architecture

```
Browser ──► Cloudflare Worker (Next.js / Hono via OpenNext)
                  ├── Better Auth ─► Hyperdrive ─► Supabase PostgreSQL
                  │
                  └── Workspace API proxy ─► Go backend (Oracle Cloud, Phoenix)
                                                    ├── Supabase PostgreSQL
                                                    └── Cloudflare R2

Browser ──► Cloudflare R2 using presigned URLs issued by the Go backend
```

The production deployment has two PostgreSQL access paths. Worker-side Better
Auth uses a request-scoped pool created by `createAuth()` and routed through the
`HYPERDRIVE` binding to Supabase PostgreSQL. The Go backend uses its direct
`DATABASE_URL` connection for workspace persistence and related server
functionality. Workspace API requests pass through the Worker to the Go backend,
which validates the identity forwarded by the Worker; document transfers use the
presigned R2 URLs it issues.

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
3. Configure the `HYPERDRIVE` binding and the Worker variables in **Workers & Pages → md-pdf-preview → Settings → Variables and Secrets**. The binding must point to the production Supabase PostgreSQL database.
4. Deploy with `npm run deploy:client`.

The deploy script passes `--keep-vars` to preserve the values configured in the
Cloudflare dashboard. Configure the connected Cloudflare Worker with these
Workers Builds settings:

| Setting           | Value            |
| ----------------- | ---------------- |
| Root directory    | `/apps/client`   |
| Production branch | `main`           |
| Preview branches  | Disabled         |
| Build command     | `npm run build`  |
| Deploy command    | `npm run deploy` |

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
Deploy command: node scripts/patch-opennext-og.mjs && npx @opennextjs/cloudflare deploy -- --keep-vars
```

Make `NEXT_PUBLIC_*` values needed for static generation available as **Build
variables and secrets**. Configure server-side Worker values and the
`HYPERDRIVE` binding as **Runtime variables** and bindings.

For local Worker preview, configure the required client variables and local
binding setup without committing secrets. The repository does not include an
`apps/client/.dev.vars.example` template.

The `wrangler.jsonc` file enables the `nodejs_compat` compatibility flag needed
by Next.js, Better Auth, and the PostgreSQL client. The Worker name can be
changed in `apps/client/wrangler.jsonc` before the first deploy; update its
`WORKER_SELF_REFERENCE` service binding to the same name.

## Deploying the server

### Dokploy (Docker)

Deploy the Go server as a separate Dokploy application on the Oracle Cloud VM in
Phoenix, United States. This configuration builds only `apps/server`; it does
not build or host the Next.js client on the VM.

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

- **Supabase PostgreSQL** — the production managed database is hosted on AWS in `us-west-1`, United States. The Go backend connects with `DATABASE_URL` and `DB_SCHEMA`; Better Auth in the Cloudflare Worker connects through the `HYPERDRIVE` binding.
- **Cloudflare R2** — R2 is configured with Cloudflare's `WNAM` jurisdiction / North America location configuration. This does not identify a specific physical datacenter. The Go backend generates presigned URLs, and browsers use those URLs to transfer document objects directly with R2.

### Hyperdrive PostgreSQL role

Use a dedicated PostgreSQL login for Hyperdrive instead of a Supabase owner,
`postgres`, or another administrative role. The Worker and Better Auth need only
permission to read and write the dedicated application schema, not to administer
the database.

Run the following as a database administrator, replacing `<DB_SCHEMA>` with the
configured PostgreSQL schema name and the password with a unique generated
secret. Configure the resulting connection string as the Hyperdrive source
connection; never commit it to an `.env` example or source file.

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

Set `DB_SCHEMA` explicitly to the same schema name used above. For example, if
`DB_SCHEMA=app2`, configure the Hyperdrive role with
`search_path = app2, public`. The Worker validates `DB_SCHEMA` and sets
`search_path` in its Hyperdrive connection string so each Worker connection
resolves Better Auth tables such as `verification` in that schema. The role-level
setting is a safe default for direct connections and other application processes.

The grant set above intentionally gives the Hyperdrive role no schema or DDL
privileges. The current Go backend, however, runs `BootstrapSchema` during
startup and creates schema objects. Its direct `DATABASE_URL` connection must use
a separate role with the required DDL privileges, or that bootstrap step must be
run separately before the backend starts. Do not use the DDL-limited Hyperdrive
role for the current Go backend startup path. New tables and sequences also need
equivalent grants before the Hyperdrive role can use them.

## Environment variables

### Cloudflare Worker client

| Variable                                    | Description                                                                                                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HYPERDRIVE`                                | Cloudflare Hyperdrive binding for the Supabase PostgreSQL source connection. This is Worker configuration, not a runtime `DATABASE_URL` variable. |
| `DB_SCHEMA`                                 | Dedicated PostgreSQL schema name. Set it explicitly and match the Hyperdrive role's `search_path`.                                                |
| `BETTER_AUTH_SECRET`                        | Random secret, at least 32 characters                                                                                                             |
| `BETTER_AUTH_URL`                           | Public URL of the client (e.g., `https://yourdomain.com`)                                                                                         |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials required by the current Better Auth configuration                                                                        |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth credentials required by the current Better Auth configuration                                                                        |
| `BACKEND_URL`                               | Internal URL of the Go server                                                                                                                     |
| `INTERNAL_API_KEY`                          | Shared secret between client and server (must match)                                                                                              |
| `RESEND_API_KEY`                            | Resend API key for verification and account-deletion emails                                                                                       |
| `RESEND_EMAIL_FROM`                         | Transactional sender address for Resend emails                                                                                                    |
| `RESEND_DAILY_SEND_LIMIT`                   | Optional verification-email quota; defaults to `100`                                                                                              |
| `RESEND_WEBHOOK_SECRET`                     | Required when verifying Resend webhook signatures                                                                                                 |

`apps/client` no longer reads `DATABASE_URL` at runtime. It remains a Go backend
configuration value and may appear in generated Cloudflare typings or local
examples, but Worker-side Better Auth uses only the `HYPERDRIVE` binding.

### Server (`apps/server/.env.example`)

| Variable                                    | Description                                                                            |
| ------------------------------------------- | -------------------------------------------------------------------------------------- |
| `APP_ENV`                                   | Required environment prefix for R2 object isolation (`prod` for the production branch) |
| `DATABASE_URL`                              | Direct Supabase PostgreSQL connection string used by the Go backend                    |
| `DB_SCHEMA`                                 | Dedicated PostgreSQL schema name used by the Go backend                                |
| `SERVER_PORT`                               | Port (default `8080`)                                                                  |
| `INTERNAL_API_KEY`                          | Must match the client's value                                                          |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 API credentials                                                                     |
| `R2_ENDPOINT`                               | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`                                        |
| `R2_BUCKET_NAME`                            | R2 bucket name                                                                         |
| `ERROR_LOGGING_*`                           | Error logger queue settings                                                            |

> **Important:** The Worker reads Cloudflare's `cf-connecting-ip` header and forwards it to the Go backend as `X-Forwarded-For`. Only rely on the forwarded value when Cloudflare actually sits in front of the Next.js origin; otherwise a caller could spoof it.

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
