# 🌐 Dashboard Services

Integration services between the dashboard and the cloud workspace.

| File | Function |
| --- | --- |
| `workspace-api.ts` | Requests for items, metadata, and documents |
| `workspace-api.test.ts` | Verifies responses, errors, and URLs |

The client calls `/api/workspace/*`, normalizes errors into `WorkspaceApiError`, and encapsulates communication with signed storage URLs.

## ☁️ Document storage

Documents do not necessarily pass through the Next.js server: the API returns signed URLs and the client uploads/downloads directly from the configured storage.
