# 🎮 Controllers

Echo HTTP layer for the backend. Converts requests into service calls and service results into JSON responses.

| Package | Main endpoints |
| --- | --- |
| `health/` | `GET /health` |
| `workspace/` | Items, documents, and signed URLs |

## 🔒 Responsibilities

- Read identity from headers prepared by the proxy.
- Bind and validate HTTP payloads.
- Translate domain errors into HTTP status codes.
- Register routes without containing PostgreSQL or R2 logic.

Controllers depend on service interfaces so they remain testable.
