# 🧠 Dashboard Stores

Dashboard state and persistence powered by Zustand.

| Store/file | Responsibility |
| --- | --- |
| `workspace-items.store.ts` | CRUD, normalization, and folder/document rules |
| `local-workspace.store.ts` | Guest workspace persisted in IndexedDB |
| `cloud-workspace.store.ts` | Cloud hydration and synchronized mutations |
| `workspace-session.store.ts` | Active source and selected document |
| `workspace-transfer.ts` | Local ↔ cloud transfers and copies |
| `workspace-clipboard.store.ts` | Internal copy/paste clipboard |
| `document-editor.store.ts` | Editor state and document zoom |
| `workspace.store.ts` | Workspace/preview zoom |
| `document-dnd.store.ts` | Temporary drag-and-drop state |

## 💾 Persistence

- Guest: IndexedDB `md-pdf-preview`, store `workspace-items`.
- Authenticated user: cloud API, PostgreSQL, and R2 through the server.
- Visual state and persisted state remain separate to avoid coupling UI with infrastructure.
