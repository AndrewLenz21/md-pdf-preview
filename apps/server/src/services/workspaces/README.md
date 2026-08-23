# 🧩 Workspace Service

Implements use cases for the authenticated workspace.

| Operation | Function |
| --- | --- |
| Create/List/Get | Manage owned folders and documents |
| Update | Rename, move, favorite, and update metadata |
| Delete | Delete the subtree and clean related R2 objects |
| Upload complete | Validate the document and store upload metadata |
| Signed URLs | Verify ownership and delegate upload/download to R2 |

## 🔒 Rules

- Validate names, types, and payloads before touching infrastructure.
- Check that an item is a document before content operations.
- Encapsulate dependencies behind interfaces for unit testing.
