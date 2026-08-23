# 📊 Dashboard

Main work module: manages the workspace, Markdown editing, paginated preview, and optional cloud synchronization.

| Submodule | Main responsibility |
| --- | --- |
| `workspace/` | Dashboard shell and selection/mode coordination |
| `document/` | Document model, parser, serialization, and rendering |
| `preview/` | Editor, paper, measurement, pagination, zoom, and print |
| `docs-sidebar/` | Folder tree, files, actions, and drag-and-drop |
| `mobile-navigation/` | Dashboard bottom navigation on mobile |
| `stores/` | Local/cloud state, session, clipboard, and transfers |
| `services/` | HTTP client for the cloud workspace |
| `constants/` and `types/` | Fixtures, limits, paper types, and editor types |

## 🔄 Data flow

```text
Markdown source
    ↓ parser / normalization
Workspace document
    ↓ editor or renderer
Paper preview
    ↓ measurement / pagination
Print or visual export
```

Local mode persists in IndexedDB. Cloud mode uses Zustand stores and the client API proxy to the Go server.
