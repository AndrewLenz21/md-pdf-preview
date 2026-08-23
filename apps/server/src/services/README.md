# ⚙️ Services

Use-case and external integration layer of the Go server.

| Package | Main responsibility |
| --- | --- |
| `workspaces/` | Workspace business rules |
| `cloudflare/` | Signed URLs and R2 operations |
| `logger/` | Asynchronous logging, PostgreSQL, and R2 archiving |

Services orchestrate repositories and external providers. Controllers should not duplicate these rules.
