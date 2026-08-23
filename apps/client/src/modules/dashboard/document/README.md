# 📄 Document

Core document model and conversion layer between Markdown, editable state, and rendered HTML.

| Area | Main responsibility |
| --- | --- |
| `model/` | Document, folder, block, and code types |
| `parser/` | Converts Markdown into a normalized structure |
| `serialization/` | Converts editor changes back to Markdown |
| `rendering/` | Renders blocks for the document view |
| `styles/` | Content, table, callout, and block styles |
| `utils/` | Shared dimensions and utilities |

## 🔄 Main flow

```text
Markdown → parser → document model → TipTap/rendering → serialization
```

This module does not decide where a document is stored; that responsibility belongs to `dashboard/stores` and `dashboard/services`.
