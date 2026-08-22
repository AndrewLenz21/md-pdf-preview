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

export const CASH_BASIS_TAX_VIEW_MARKDOWN = `---
<aside>
📌

**Contract snapshot:** 120 billable days from 15 June to December 2026 at **€210/day**. Total expected revenue: **€25,200.00**.

</aside>

## 🗓️ Monthly billable-day plan

The calendar from 15 June through 31 December contains more than 120 possible working days. In August, the planned leave from **10 to 21 August inclusive** removes 10 weekdays, leaving **11 billable days**. To respect the contractual cap, December is therefore set to **11 days**. The known non-working dates of **24 July** and **1 September** are also excluded.

| Month | Billable days | Gross revenue | Calendar note |
| --- | --- | --- | --- |
| June 2026 | 12 | €2,520.00 | Started Monday, 15 June |
| July 2026 | 22 | €4,620.00 | 24 July excluded |
| August 2026 | 11 | €2,310.00 | Leave from 10–21 August inclusive |
| September 2026 | 21 | €4,410.00 | 1 September excluded |
| October 2026 | 22 | €4,620.00 | Full available month |
| November 2026 | 21 | €4,410.00 | Full available month |
| December 2026 | 11 | €2,310.00 | Adjusted to close the 120-day cap |
| **TOTAL** | **120** | **€25,200.00** | Contract cap reached exactly |

## 🧾 Tax assumptions used

- Tax regime: **regime forfettario**, ordinary **15% imposta sostitutiva**.
- Profitability coefficient: **67%**.
- Social-security category: **INPS Artigiani**, standard IVS rate **24%**.
- Approved forfettario social-security reduction: **35% reduction** of the IVS contribution.
- Activity period used for this estimate: **7 months, June–December 2026**.
- 2026 INPS annual minimum income: **€18,808.00**, prorated to seven months: approximately **€10,971.33**.
- Maternity contribution included at **€0.62 per active month**.
- INPS contributions are deducted from the forfettario taxable income before applying the 15% substitute tax.

<aside>
⚠️

This is a planning estimate, not an F24 calculation. The exact first-year INPS amounts depend on the effective INPS registration date, the amounts generated in the Cassetto Previdenziale, and which contributions are actually paid within each tax year.

</aside>

## 🧮 Annual calculation

| Calculation | Estimated amount |
| --- | --- |
| Gross revenue — 120 × €210 | €25,200.00 |
| Forfettario income — 67% | €16,884.00 |
| Estimated INPS Artigiani after 35% reduction | €2,638.24 |
| Taxable income after deductible INPS | €14,245.76 |
| Imposta sostitutiva — 15% | €2,136.86 |
| **Normal final burden — INPS + tax** | **€4,775.11** |
| Tax acconto reserve — 100% of estimated substitute tax | €2,136.86 |
| Conservative INPS excess-income acconto reserve | €922.38 |
| **Cash reserve including acconti** | **€7,834.35** |

<aside>
💸

**Normal tax cost**

€4,775.11 — approximately **18.95% of gross revenue**.

</aside>

<aside>
🛡️

**Conservative reserve with acconti**

€7,834.35 — approximately **31.09% of gross revenue**.

</aside>

> **Important:** acconti are advance payments credited against the following year's tax and variable INPS liability. They increase the cash needed around declaration deadlines, but they are not a second permanent tax on the same income.
>

## 📊 Monthly revenue and tax reserve

The monthly amounts below allocate the annual estimates proportionally across each invoice. This is a budgeting method; actual F24 payments are not monthly.

| Month | Days | Gross (100%) | Est. final tax + INPS (18.95%) | Prudent reserve incl. acconti (31.09%) | Real reserve (40.00%) | Available after prudent reserve (68.91%) |
| --- | --- | --- | --- | --- | --- | --- |
| June 2026 | 12 | €2,520.00 | €477.51 | €783.43 | €1,008.00 | €1,736.57 |
| July 2026 | 22 | €4,620.00 | €875.44 | €1,436.30 | €1,848.00 | €3,183.70 |
| August 2026 | 11 | €2,310.00 | €437.72 | €718.15 | €924.00 | €1,591.85 |
| September 2026 | 21 | €4,410.00 | €835.64 | €1,371.01 | €1,764.00 | €3,038.99 |
| October 2026 | 22 | €4,620.00 | €875.44 | €1,436.30 | €1,848.00 | €3,183.70 |
| November 2026 | 21 | €4,410.00 | €835.64 | €1,371.01 | €1,764.00 | €3,038.99 |
| December 2026 | 11 | €2,310.00 | €437.72 | €718.15 | €924.00 | €1,591.85 |
| **TOTAL** | **120** | **€25,200.00** | **€4,775.11** | **€7,834.35** | **€10,080.00** | **€17,365.65** |

## 💰 40% reserve surplus analysis

This table separates the estimated acconti, the potential long-term saving, and the amount that is already above the complete prudent reserve.

| Month | Real reserve (40.00%) | Acconti (12.14%) | Difference vs. final tax + INPS (21.05%) | Difference vs. all taxes incl. acconti (8.91%) |
| --- | --- | --- | --- | --- |
| June 2026 | €1,008.00 | €305.92 | €530.49 | €224.57 |
| July 2026 | €1,848.00 | €560.86 | €972.56 | €411.70 |
| August 2026 | €924.00 | €280.43 | €486.28 | €205.85 |
| September 2026 | €1,764.00 | €535.37 | €928.36 | €392.99 |
| October 2026 | €1,848.00 | €560.86 | €972.56 | €411.70 |
| November 2026 | €1,764.00 | €535.37 | €928.36 | €392.99 |
| December 2026 | €924.00 | €280.43 | €486.28 | €205.85 |
| **TOTAL** | **€10,080.00** | **€3,059.24** | **€5,304.89** | **€2,245.65** |

<aside>
🧾

**Estimated acconti generated by the complete contract model:** **€3,059.24 (12.14%)**. These are advances connected to the 2026–2027 tax cycle and are expected to be paid mainly during 2027; they are not an additional permanent tax. Because November and December payments are expected in 2027, the exact acconti attributable strictly to the 2026 tax year will depend on actual collection dates and cash-paid INPS deductions.

</aside>

### 🧮 Average monthly spending capacity — 7 contract months

The amounts below divide the total contract result by the seven working months from June through December. They are average budgeting limits, not the actual monthly bank cash flow because client payments arrive later.

| Budget scenario | Total available | Average per month ÷ 7 | Available percentage |
| --- | --- | --- | --- |
| After final tax + INPS, without acconti | €20,424.89 | €2,917.84 | 81.05% |
| After prudent reserve, including acconti | €17,365.65 | €2,480.81 | 68.91% |
| After the actual 40% reserve | €15,120.00 | €2,160.00 | 60.00% |
| Acconti cash effect | €3,059.24 | €437.03 per month | 12.14% |

<aside>
🌱

**Potential long-term saving — 21.05%**

Approximately **€5,304.89** remains above the estimated permanent tax and INPS cost after the acconti are eventually credited against later liabilities.

</aside>

<aside>
🔐

**Immediate extra safety buffer — 8.91%**

Approximately **€2,245.65** is already above the complete prudent reserve of €7,834.35, including estimated acconti.

</aside>

## 📅 Expected payment windows

Payment timing is modeled as **one month plus up to 15 days** after the invoiced month, following the example that June is received between 1 and 15 August.

| Work month | Invoice amount | Expected payment range | Reserve incl. acconti |
| --- | --- | --- | --- |
| June 2026 | €2,520.00 | 1–15 August 2026 | €783.43 |
| July 2026 | €4,620.00 | 1–15 September 2026 | €1,436.30 |
| August 2026 | €2,310.00 | 1–15 October 2026 | €718.15 |
| September 2026 | €4,410.00 | 1–15 November 2026 | €1,371.01 |
| October 2026 | €4,620.00 | 1–15 December 2026 | €1,436.30 |
| November 2026 | €4,410.00 | 1–15 January 2027 | €1,371.01 |
| December 2026 | €2,310.00 | 1–15 February 2027 | €718.15 |

## 🔗 Official references

- INPS Circular No. 14 of 9 February 2026 — Artigiani and Commercianti contributions for 2026
- INPS — Artigiani contribution rates and payment structure
- INPS Circular No. 35 of 19 February 2016 — 35% forfettario contribution reduction
- Agenzia delle Entrate — forfettario substitute-tax balance and first acconto

<aside>
✅

**Practical budgeting rule for this contract:** move **31.1% of every payment** into the tax account. Your existing 40% rule remains safer and leaves an additional buffer for accountant costs, timing differences, INPS adjustments, or other income.

</aside>

Cash-Basis Tax View — Incassato vs Fatturato`;

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
    id: "cash-basis-tax-view",
    title: "Cash-Basis Tax View",
    group: "recent",
    updatedAt: "Edited today",
    content: CASH_BASIS_TAX_VIEW_MARKDOWN,
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
