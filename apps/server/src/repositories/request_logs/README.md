# 🧾 Request Logs Repository

Stores request traces and updates the archived error document.

| Method | Function |
| --- | --- |
| `Create` | Persists request ID, user, endpoint, status, outcome, and duration |
| `UpdateLoggerError` | Adds structured JSON after the R2 upload |

Converts UUIDs, IPs, JSON, and optional values before invoking the corresponding SQL functions.
