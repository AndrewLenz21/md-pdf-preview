# 💚 Health Controller

Exposes the minimal endpoint used to verify that the HTTP process is alive.

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/health` | `200 {"status":"ok"}` |

It does not query PostgreSQL or Cloudflare R2. It is used by probes, tunnels, load balancers, and quick diagnostics.
