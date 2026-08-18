import type { MockDocument } from "../document/model/document.types";

const PROJECT_RESEARCH_MARKDOWN = `# Project Research

This working document collects the clearest product signals before they become a proposal.

<aside>
🎯 **Core idea:** Make it easy to move from a loose thought to a clear, printable document without leaving the workspace.
</aside>

## What we are learning

People return to a document when its context is visible at a glance. Recent work, source notes, and the current page should live together without competing for attention.

- Keep the first reading surface focused and calm.
- Make document history easy to scan from the left edge.
- Let the paper carry hierarchy instead of surrounding chrome.

## Open questions

1. Which export settings are essential for a first release?
2. How should long source material become structured notes?
3. When does a document need a second page?
`;

const PRODUCT_PROPOSAL_MARKDOWN = `<aside>
🎯

**Core idea:** a simple, useful open-source companion for Notion that lets users paste Notion content and preview exactly how it will paginate before exporting or printing it as PDF.

</aside>


\`\`\`jsx
cd 'C:\\Andrew\\Projects\\Portfolio Projects\\2026-08\\md-pdf-preview'
\`\`\`

## PROGRESS

AGENT ANALYSIS:

\`\`\`jsx
Important Risks
1. X-User-Id is trusted based only on the shared API key. This creates an impersonation risk if the API key is exposed.
2. Credentials login can panic for OAuth-only users because *user.PasswordHash is dereferenced without checking for nil in services/auth/service.go:112.
3. Webhook processing errors return HTTP 200 in controllers/webhooks/controller.go:55-61, which can prevent Lemon Squeezy from retrying failed events.
4. The database pool can fail while the Go server continues starting. main.go does not check the result of CreateConnectionPool().
5. EnsurePro middleware exists but is not attached to any route.
6. DB_SCHEMA defaults are inconsistent:
- Client adapter: app_test
- Most Go repositories: app_test
- Logger repository: next_auth
7. Plans are duplicated:
- Frontend hardcodes prices and Lemon Squeezy variant IDs.
- Backend has a plans table.
8. Subscription status rules differ. The frontend treats every cancelled subscription as active, while Go checks whether the cancellation date is still in the future.
9. No tests were found in the analyzed client/server scope.
10. Shared packages/ui components are still generic Turborepo starter components and are not used by the client, which has its own UI system.
\`\`\`

## SOME ISSUES

\`\`\`jsx
Warnings / issues found
1. Real credentials in env files (rotatable)
- apps/client/.env.local and apps/server/.env contain a live Supabase password ([REDACTED], URL-encoded) and a live BETTER_AUTH_SECRET ([REDACTED]).
- Both files are gitignored and absent from git history (verified) — so they are not exposed via the repo. But the password is weak-ish and reused across both apps (Go server + Next.js auth share the same DB role), and now exists in plaintext in two files. Recommend rotating and separating dev/prod credentials.
2. TLS verification disabled — auth.ts:52-54
ssl: { rejectUnauthorized: false } accepts any certificate; an attacker between the app and Supabase pooler could MITM the DB connection (steal hashes, sessions). The comment acknowledges it's a Supabase pooler workaround, but the fix is to pin Supabase's CA, not disable verification.
3. Spoofable IP header — auth.ts:71
ipAddressHeaders: ["cf-connecting-ip"] replaces the default x-forwarded-for list, and nothing verifies the request actually came through Cloudflare. Any direct request to the origin can forge the header, which:
- bypasses the built-in rate limiter (key is ip|path; confirmed rate limiting is on by default in production, 10s/100 requests),
- poisons session.ipAddress tracking.
Mitigation: only allow direct-to-origin via Cloudflare (firewall/authenticated origin pulls), or validate with trustedProxies.
4. No email verification — emailAndPassword has requireEmailVerification off by default; accounts are created with emailVerified=false and usable immediately. Not a leak, just a gap if you expect verified emails.
5. BETTER_AUTH_URL=http://localhost:3000 — fine for dev, but will break cookies/redirects in production if not overridden (warning-level).
Things that look correct
- Secret has 32+ chars of strong entropy, validated at startup; DB schema name validated against injection; generateId: "uuid" is a valid option in 1.6.27; passwords hashed server-side (scrypt); no credentials hardcoded in source or committed to git.
Suggested fix plan (if you want)
1. Rotate Supabase password + BETTER_AUTH_SECRET; use separate dev/prod values.
2. Replace rejectUnauthorized: false with Supabase's root CA.
3. Verify Cloudflare provenance (e.g., origin pull certs / firewall) or drop the custom IP header.
4. Optionally enable requireEmailVerification and per-environment BETTER_AUTH_URL.
\`\`\`

## 🧠 Problem

Notion content can look correct on screen but export poorly to PDF, especially with **wide or long tables**, page breaks, images, code blocks, and content that gets cut vertically or horizontally.

The goal is not to recreate Notion. The goal is to solve one problem extremely well:

> **Paste Notion content → preview real paper pages → adjust → export or print.**

## ✨ Core Features

- 📋 Paste content copied from Notion.
- 📄 Select paper size before previewing.
- 👀 Show the actual page divisions directly in the preview.
- 📐 Detect content that overflows or is likely to be cut.
- 🧩 Allow lightweight layout customization before export.
- 🖨️ Print directly from the application.
- 📥 Export the final result as PDF.
- 💾 Keep a local history of previous documents/previews.

## 📐 PDF Preview Experience

The preview is the heart of the product.

Users should be able to see:

- Where each PDF page begins and ends.
- Whether a table fits inside the selected paper size.
- Whether an image, code block, callout, or other element crosses a page boundary badly.
- How margins affect the final result.
- Portrait vs landscape behavior when supported.

Possible customization options over time:

- Paper size.
- Orientation.
- Margins.
- Table fit-to-page behavior.
- Font scale.
- Manual page breaks.
- Optional per-page landscape sections for wide tables.

## 🔒 Local-First by Default

The application must be fully useful **without creating an account**.

### Without login

- Paste Notion content.
- Preview PDF pages.
- Customize layout.
- Export or print.
- Save document history locally.
- Reopen previous local documents.

<aside>
💚

**Principle:** login must never be required for the core PDF workflow.

</aside>

## ☁️ Optional Login & Sync

Accounts exist only for users who want synchronization across devices.

When logged in, the user can:

- Sync document history.
- Sync saved preview/export settings.
- Reopen documents from another device.
- Preserve account history in the cloud.

### Local → Account Migration

If a user has already used the application locally and later creates an account, the application should offer:

> **Move my local documents and history to my account**

The migration should be explicit and optional. Local content should never disappear automatically because the user logged in.

## 🕘 History

History should remain intentionally simple.

Each item can store:

- Document title.
- Last edited date.
- Original pasted content.
- Paper size/orientation.
- Preview customization.
- Last export date if useful.

Two modes:

- 💻 Local history — stored on the current device.
- ☁️ Synced history — available after login.

## 🪜 Initial Roadmap

### Phase 1 — Core local preview

- [ ] Paste Notion content.
- [ ] Parse/render the supported content faithfully.
- [ ] Choose paper size.
- [ ] Render visible page divisions.
- [ ] Print/export PDF.

### Phase 2 — Layout controls

- [ ] Margins and orientation.
- [ ] Table overflow handling.
- [ ] Manual page breaks.
- [ ] Better handling for images, callouts, and code blocks.

### Phase 3 — Local history

- [ ] Save previews locally.
- [ ] Reopen/edit previous documents.
- [ ] Delete/rename history items.

### Phase 4 — Account & synchronization

- [ ] Authentication.
- [ ] Cloud history sync.
- [ ] Sync export preferences.
- [ ] Local-to-account migration flow.

### Phase 5 — Polish & open-source release

- [ ] Public documentation.
- [ ] Screenshots/demo.
- [ ] Self-hosting/development instructions.
- [ ] Accessibility review.
- [ ] Stable release.

## 🚫 Explicit Non-Goals

Keep the scope controlled.

- ❌ Not a Notion clone.
- ❌ Not a collaborative editor.
- ❌ No AI required.
- ❌ No complex workspace/project management.
- ❌ No realtime collaboration.
- ❌ No requirement to connect a Notion account for the MVP.

## 🧪 Engineering Quality Requirement

This project should also strengthen the engineering portfolio.

Testing should include regression fixtures for difficult document layouts such as:

- Wide tables.
- Long multi-page tables.
- Nested lists.
- Code blocks.
- Large images.
- Manual page breaks.
- Landscape pages.
- Different paper sizes.
- Local-to-account migration behavior.

**Unit tests, integration tests, and CI are part of the project definition, not optional polish.**

## 🏁 Success Definition

Version 1 is successful when a user can paste real Notion content, clearly see how it will paginate, fix common export problems, and produce a clean PDF without ever needing to create an account.
`;

export const MOCK_DOCUMENTS: MockDocument[] = [
  {
    id: "project-research",
    title: "Project Research",
    group: "recent",
    updatedAt: "Edited today",
    content: PROJECT_RESEARCH_MARKDOWN,
  },
  {
    id: "product-proposal",
    title: "Product proposal",
    group: "recent",
    updatedAt: "Edited yesterday",
    content: PRODUCT_PROPOSAL_MARKDOWN,
  },
  {
    id: "research-notes",
    title: "Research notes",
    group: "recent",
    updatedAt: "Edited 3 days ago",
  },
  {
    id: "meeting-notes",
    title: "Meeting notes",
    group: "documents",
    updatedAt: "Edited Monday",
  },
  {
    id: "architecture",
    title: "Architecture",
    group: "documents",
    updatedAt: "Edited last week",
  },
  {
    id: "roadmap",
    title: "Roadmap",
    group: "documents",
    updatedAt: "Edited last week",
  },
  {
    id: "ideas",
    title: "Ideas",
    group: "documents",
    updatedAt: "Edited 2 weeks ago",
  },
];

export const SELECTED_DOCUMENT_ID = "project-research";
