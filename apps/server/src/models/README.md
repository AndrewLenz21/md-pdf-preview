# 🧱 Models

Defines data contracts shared by controllers, services, and repositories.

| Model | Represents |
| --- | --- |
| `WorkspaceItem` | A folder or document inside the workspace |
| `RequestLog` | Request outcome and metadata |
| `Logger` | Structured details for an archived error |

It also contains create, update, and upload-completion parameters. Models prevent each layer from inventing a different representation for the same data.
