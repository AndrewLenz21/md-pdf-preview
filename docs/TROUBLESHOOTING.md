# Troubleshooting Guide

> Common issues encountered during development and deployment of md-pdf-preview.

The commands in this guide target Windows 10/11 with PowerShell.

## Table of Contents

- [Environment variable errors on startup](#environment-variable-errors-on-startup)
- [Cloud features unavailable](#cloud-features-unavailable)
- [Go not found when running the server](#go-not-found-when-running-the-server)
- [Port 3000 or 8080 already in use](#port-3000-or-8080-already-in-use)
- [Page-break markers misaligned](#page-break-markers-misaligned)
- [Workspace documents missing after browser update](#workspace-documents-missing-after-browser-update)
- [Authentication redirects fail in production](#authentication-redirects-fail-in-production)
- [Client sends spoofable IP header](#client-sends-spoofable-ip-header)
- [Backend unavailable (503) from the workspace API](#backend-unavailable-503-from-the-workspace-api)
- [Stale or cached deployment](#stale-or-cached-deployment)

---

### Environment variable errors on startup

**Symptom:**  
The client crashes on startup with an error like:

```
BACKEND_URL must be configured.
```

**Solution:**  
Copy the example file and fill in real values:

```powershell
Copy-Item apps/client/.env.example apps/client/.env.local
```

Required values even for local-only mode:

| Variable | Example |
| -------- | ------- |
| `BETTER_AUTH_SECRET` | a random string of 32+ characters |
| `BETTER_AUTH_URL` | `http://localhost:3000` |
| `BACKEND_URL` | `http://localhost:8080` |
| `INTERNAL_API_KEY` | a long random secret (must match the server) |

---

### Cloud features unavailable

**Symptom:**  
The dashboard works, but signing in or cloud sync fails with "Backend service is unavailable" or "Workspace service is unavailable".

**Solution:**  
Check the full stack is running and configured:

- Is the Go server running on the port in `BACKEND_URL`? → `curl.exe http://localhost:8080/health`
- Do client and server share the same `INTERNAL_API_KEY`?
- Is PostgreSQL reachable from the server (`DATABASE_URL`)?
- If R2 is not configured, document upload/download will fail — local workspace still works.

---

### Go not found when running the server

**Symptom:**  
`npm run dev` fails when turbo reaches the server task, with an error mentioning `go` or `air` not found.

**Solution:**  
The server dev task requires:

- **Go** 1.25+ installed and in `PATH`
- [**air**](https://github.com/air-verse/air) installed (`go install github.com/air-verse/air@latest`)

If you only want to work on the client, run it alone:

```powershell
npm run dev --filter=client
```

---

### Port 3000 or 8080 already in use

**Symptom:**  
Next.js or Echo fails to bind its port during `npm run dev`.

**Solution:**

- Change the client port: `npm run dev --filter=client -- --port 3001` (or set `PORT`).
- Change the server port: set `SERVER_PORT` in `apps/server/.env`.

---

### Page-break markers misaligned

**Symptom:**  
The page-break overlay markers don't line up with the actual page boundaries in the preview.

**Explanation:**  
Markers are computed from block measurements at the current paper size and zoom. They are re-attached when the selected document, mode, or viewport changes.

**Checklist:**

- [ ] Zoom is the same between editor and preview (each pane has its own zoom control).
- [ ] The viewport didn't change size while editing (resizing the window mid-session can desync markers until the next re-render).
- [ ] On mobile, the preview section is active (`mobileSection === "preview"`).

If markers are still off, open an issue with a minimal Markdown document that reproduces it — pagination fidelity is a bug, not a cosmetic detail.

---

### Workspace documents missing after browser update

**Symptom:**  
Documents created in local mode disappear after a browser update or cache clear.

**Explanation:**  
Local workspace data lives in **IndexedDB** under the database name `md-pdf-preview`. Clearing site data, using private browsing, or a fresh browser profile removes it.

**Workaround:**

- Export important documents or sign in and use cloud sync.
- Do not clear "Site data" for the app's origin.

---

### Authentication redirects fail in production

**Symptom:**  
Sign in/up works in dev but redirects fail or sessions don't persist in production.

**Solution:**  
Configure better-auth `trustedOrigins` with your production origins. See the deployment notes in `apps/client/README.md`:

```ts
trustedOrigins: [
  "https://yourdomain.com",
  "https://www.yourdomain.com",
  "http://localhost:3000",
];
```

Also make sure `BETTER_AUTH_URL` points to the public URL.

---

### Client sends spoofable IP header

**Symptom:**  
The server trusts `cf-connecting-ip` for rate limiting, but the client is not actually behind Cloudflare.

**Explanation:**  
When Cloudflare does not sit in front of the Next.js origin, any caller can set `cf-connecting-ip` and bypass IP-based rate limits.

**Solution:**  
Only deploy this configuration when Cloudflare controls access to the Next.js origin. The proxy falls back to `x-real-ip` / `x-forwarded-for` when `cf-connecting-ip` is absent — see `apps/client/src/lib/backend/server.ts`.

---

### Backend unavailable (503) from the workspace API

**Symptom:**  
`/api/workspace/*` returns `503 BACKEND_UNAVAILABLE`.

**Solution:**  
The Hono proxy couldn't reach the Go server. Verify:

- [ ] `BACKEND_URL` is set and correct (no trailing slash needed, but harmless).
- [ ] The server process is running.
- [ ] The server's `INTERNAL_API_KEY` matches the client's.
- [ ] Network rules/firewalls allow the client host to reach the server port.

---

### Stale or cached deployment

**Symptom:**  
Changes pushed to `main` are not reflected on the live site.

**Checklist:**

- [ ] Check the **Deployments** tab in Cloudflare — is the latest commit deployed?
- [ ] Is the **active deployment** the one you expect?
- [ ] Perform a **hard refresh** (`Ctrl + F5`) to bypass browser cache.
- [ ] Confirm the domain points to the **Production** environment, not a preview branch.
