# @repo/ui

Shared React component library for the md-pdf-preview monorepo.

## 📦 Components

| Component | Description |
| --------- | ----------- |
| `Button` | Generic button with className passthrough |
| `Card` | Container card |
| `Code` | Inline code / code block wrapper |

## 🧱 Stack

- React 19
- TypeScript (strict)
- Tailwind CSS v4 classes passed via `className`

## 🚀 Usage

Import any component directly:

```tsx
import { Button } from "@repo/ui/button";

export function App() {
  return <Button className="rounded-md">Click me</Button>;
}
```

Each component is exported from its own file (`@repo/ui/<component>`) and can be imported by any app in the workspace.

## 🧪 Checks

```bash
npm run lint --filter=@repo/ui         # ESLint
npm run check-types --filter=@repo/ui  # tsc --noEmit
```

## 📄 License

MIT — see the repository root.