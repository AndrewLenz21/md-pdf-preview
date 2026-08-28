# 🗂️ Docs Sidebar

Displays and manipulates the workspace folder and file tree.

| Feature | Description |
| --- | --- |
| Tree | Shows folders, documents, hierarchy, and expanded state |
| Actions | Create, rename, copy, move, favorite, and delete |
| Sources | Switches between files saved on this device and cloud-synced files |
| Drag-and-drop | Moves or transfers items between folders and sources |
| Dialogs | Centralizes confirmations and metadata editing |

## 🔄 Main flow

`DocsSidebar` coordinates interaction and delegates mutations to the local/cloud stores. `FolderTree` and `DocumentItem` handle rendering and item-specific actions.

## 📱 Mobile

On small screens, actions are presented as touch-friendly dialogs; desktop uses popovers and inline menus.
