# 🗄️ Repositories

PostgreSQL persistence layer. Encapsulates queries, SQL functions, type conversion, and data ownership.

| Package | Persistence |
| --- | --- |
| `workspace_items/` | Folders, documents, metadata, and subtrees |
| `request_logs/` | Request metadata and error documents |

Repositories receive `context.Context`, schema, and an initialized pool. They do not contain HTTP presentation logic.
