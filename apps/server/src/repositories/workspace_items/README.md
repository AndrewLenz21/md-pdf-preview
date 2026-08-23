# 📁 Workspace Items Repository

Persists each user's folder and document structure.

| Operation | Function |
| --- | --- |
| Create/List/Get | Basic CRUD with per-user ownership |
| Update | Metadata, parent, favorites, and order |
| Upload complete | Stores object key, hash, size, and revision |
| Collect keys | Finds R2 objects in a subtree |
| Delete | Deletes an item and its descendants |
| Mapping | Converts PostgreSQL rows into `models.WorkspaceItem` |

Operations delegate to SQL functions such as `fn_workspace_item_create` and `fn_workspace_item_delete`, keeping integrity rules close to the database.
