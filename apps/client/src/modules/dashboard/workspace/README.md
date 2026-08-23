# 🖥️ Workspace

Main dashboard shell. `DashboardWorkspace` connects the sidebar, editor, preview, document selection, and responsive layout.

| Responsibility | Description |
| --- | --- |
| Selection | Opens the active document and keeps its source |
| Layout | Coordinates desktop panels and mobile sections |
| Editing | Connects Markdown source, TipTap, and persistence |
| Preview | Connects paper preview, zoom, print, and navigation |
| Actions | Reacts to document creation, deletion, and changes |

This is the composition point for the experience; specific logic lives in `document`, `preview`, `docs-sidebar`, and `stores`.
