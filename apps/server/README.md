# Server — md-pdf-preview

Go 1.25 backend (Echo v4) for the md-pdf-preview cloud workspace: the workspace API, PostgreSQL persistence, Cloudflare R2 presigned URLs, rate limiting, and request logging.

The server is **optional**. The client runs in local-only mode (IndexedDB) without it. Cloud sync requires it.

## ✨ What's Here

- **Workspace API** — folders and documents: list, create, update, delete
- **Document storage** — Cloudflare R2 presigned URLs (client uploads/downloads directly)
- **PostgreSQL persistence** — workspace items, request logs, automatic schema migrations
- **Security** — API-key middleware, per-user identity headers, IP-based rate limiting
- **Logging** — structured request logging and a queue-based error logger
- **Graceful shutdown** — clean pool and server shutdown on SIGINT/SIGTERM

## 🧱 Stack

| Layer | Technology |
| ----- | ---------- |
| Framework | [Echo](https://echo.labstack.com) v4 |
| Database | PostgreSQL via [pgx](https://github.com/jackc/pgx) v5 |
| Storage | Cloudflare R2 via AWS SDK v2 (S3-compatible) |
| Config | godotenv (`.env` file) |
| Tests | Standard library + Echo test helpers |

## 🚀 Getting Started

### Prerequisites

- **Go** 1.25+
- **PostgreSQL** (local, Docker, or Supabase/Neon)
- [**air**](https://github.com/air-verse/air) for hot-reload (optional)

### Run

```bash
# 1. Configure environment variables
cp .env.example .env
#   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:5432/postgres
#   INTERNAL_API_KEY=generate_a-long-random-secret
#   R2_*  (only if you use document cloud storage)

# 2. Start the server (hot-reload)
npm run dev --filter=server

# 3. Or build and run the binary
npm run build --filter=server
./build/server.exe        # Windows
./build/server            # macOS / Linux
```

Health check: `curl http://localhost:8080/health`

> **Note:** Migrations in `src/config/postgres/migrations/` run automatically at startup. The PostgreSQL pool starts independently, so a database outage never blocks the HTTP server.

## 📂 Structure

```
src/
├── config/
│   ├── environment/       # .env loading
│   ├── logging/           # Console + queue-based error logger
│   ├── postgres/          # Connection pool, migrations, queries
│   ├── cloudflare/        # R2 client initialization
│   ├── middlewares/       # API key auth, rate limiter
│   └── server/            # Echo setup, routes, graceful shutdown
├── controllers/
│   ├── health/            # GET /health
│   └── workspace/         # Workspace item & document endpoints
├── models/                # WorkspaceItem, RequestLog
├── repositories/          # PostgreSQL data access
└── services/
    ├── workspaces/        # Workspace business logic
    ├── cloudflare/        # R2 presigned URL generation
    └── logger/            # Request logging middleware, error service
```

## 🌐 API Endpoints

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/health` | Health check |
| `GET` | `/workspace/items` | List workspace items for the authenticated user |
| `POST` | `/workspace/items` | Create a folder or document |
| `GET` | `/workspace/items/:id` | Get a single item |
| `PATCH` | `/workspace/items/:id` | Rename, move, favorite, reorder, recolor |
| `DELETE` | `/workspace/items/:id` | Soft delete an item |
| `POST` | `/workspace/documents/:id/upload-url` | Get an R2 presigned upload URL |
| `POST` | `/workspace/documents/:id/upload-complete` | Confirm upload (stores metadata) |
| `GET` | `/workspace/documents/:id/download-url` | Get an R2 presigned download URL |

### Authentication

Requests must include:

| Header | Description |
| ------ | ----------- |
| `X-Api-Key` | Shared secret with the client (`INTERNAL_API_KEY`) |
| `X-User-Id` | The authenticated user's ID (set by the client proxy) |
| `X-Forwarded-For` | Client IP for rate limiting (set by the client proxy) |

The server never exposes this API publicly — it is meant to be reached only through the Next.js proxy.

## 🧪 Tests

```bash
npm run check-types --filter=server   # go test ./...
```

Coverage includes controllers, services, repositories, and middlewares (API key, rate limiter, logger).

## 🔑 Environment Variables

See [`.env.example`](./.env.example) for the full list with comments. Key variables:

| Variable | Description |
| -------- | ----------- |
| `DATABASE_URL` | PostgreSQL connection string |
| `DB_SCHEMA` | PostgreSQL schema name |
| `SERVER_PORT` | HTTP port (default `8080`) |
| `INTERNAL_API_KEY` | Shared secret with the client |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 credentials |
| `R2_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `R2_BUCKET_NAME` | R2 bucket name |
| `ERROR_LOGGING_*` | Error logger queue size, workers, timeout |

## 📄 License

MIT — see the repository root.