# 🧩 Client Modules

The client organizes editing, authentication, and navigation by functional domain.

| Module | Main responsibility |
| --- | --- |
| `auth` | Sign-up, sign-in, verification, and OAuth |
| `navigation` | Navbar, preferences, themes, locales, and mobile navigation |
| `dashboard` | Workspace, Markdown editor, paginated preview, and sync |

Each module exposes its public API from an `index.ts` file and keeps its components, services, and state close to the functionality they implement.
