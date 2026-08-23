# 🧾 Logger Service

Processes request logs asynchronously so HTTP responses are not blocked.

| Stage | Action |
| --- | --- |
| Dispatch | Queues the `RequestLog` without blocking indefinitely |
| Workers | Process the queue in configurable goroutines |
| R2 archive | Compresses and archives error details |
| PostgreSQL | Stores request metadata and outcome |
| Stop | Closes the queue and waits for workers with a timeout |

Queue size, worker count, and timeout are controlled by `ERROR_LOGGING_*`. If the queue is full, the log is dropped so the user request remains the priority.
