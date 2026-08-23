# ☁️ Cloudflare Service

Application adapter for Cloudflare R2 through the S3-compatible client.

| Capability | Use |
| --- | --- |
| Object keys | Builds stable keys `files/{user}/{document}/content.txt` |
| Upload URL | Enables direct, temporary client uploads |
| Download URL | Enables direct, temporary downloads |
| Delete | Removes individual or batched objects |
| Logger objects | Stores compressed logs in R2 |
| Multipart | Prepares large multipart uploads |

The service validates UUIDs, content types, and storage state before calling R2.
