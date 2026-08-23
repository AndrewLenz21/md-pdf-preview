# 🗂️ Workspace Controller

HTTP controller for folders, documents, and storage operations.

| Group | Routes |
| --- | --- |
| Items | List, create, get, update, and delete |
| Upload | Generate URL and complete upload |
| Download | Generate signed download URL |

## 🔄 Flow

```text
Echo request → authentication/header → bind/validation → Workspace Service → JSON
```

The controller never accesses the database directly. Tests can inject a service factory.
