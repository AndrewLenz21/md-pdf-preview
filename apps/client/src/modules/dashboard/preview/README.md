# 🖨️ Preview

Module that transforms a document into a precise, print-ready paper view.

| Area | Main responsibility |
| --- | --- |
| `components/` | Markdown editor, TipTap editor, toolbar, and PaperPreview |
| `measurement/` | Measures blocks and detects content crossing pages |
| `hooks/` | Print mode, zoom, and interaction synchronization |
| `editing/` | Selection and editing over the preview |
| `utils/` | Document parsing, actions, and page markers |
| `constants/` | Pagination rules and values |

## 🔄 Main flow

1. Receives the selected document.
2. Renders blocks inside a configurable paper sheet.
3. Measures heights and generates page breaks.
4. Synchronizes editor, preview, scroll, and print mode.

Supports A4, A5, Letter, and Legal, with responsive zoom for desktop and mobile.
