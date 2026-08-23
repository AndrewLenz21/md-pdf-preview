# Security Policy

md-pdf-preview stores documents locally in your browser and, when you sign in, in cloud storage managed by the Go backend. We take security seriously — including the fidelity of the data you write. This document outlines our approach and how to report vulnerabilities.

## ✅ Supported Versions

| Version | Supported |
| ------- | --------- |
| Latest stable release | ✅ |
| Previous stable release | ⚠️ Critical fixes only |
| Development builds | ❌ |

We recommend always running the latest release.

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability, please report it privately — **do not file a public issue**.

**How to report:**

1. Open a **private security advisory** on GitHub:
   - Go to https://github.com/AndrewLenz21/md-pdf-preview/security/advisories
   - Click "New draft security advisory"
   - Fill in the details

2. If you cannot use GitHub advisories, email [INSERT EMAIL ADDRESS] with:
   - **Subject:** "Security vulnerability in md-pdf-preview"
   - **Description:** A clear description of the issue
   - **Steps to reproduce:** Detailed steps to reproduce the vulnerability
   - **Impact:** What an attacker could achieve
   - **Suggested fix:** (optional) A proposed patch or mitigation

## 🤫 Responsible Disclosure

We ask that you:

- **Do not** disclose the vulnerability publicly until we have had a reasonable opportunity to address it.
- **Do not** exploit the vulnerability beyond what is necessary to demonstrate it.
- **Do not** access, modify, or exfiltrate data that is not your own.

In return, we will:

- Acknowledge receipt of your report within **72 hours**.
- Provide an initial assessment within **5 business days**.
- Keep you informed of progress toward a fix.
- Credit you in the release notes (if you wish) once the vulnerability is resolved.

## ⏱️ Expected Response Timeline

| Event | Expected timeframe |
| ----- | ------------------ |
| Acknowledgment | Within 72 hours |
| Initial assessment | Within 5 business days |
| Fix for critical issues | Within 14 days |
| Fix for moderate issues | Within 30 days |
| Public disclosure | After a fix is released |

## 🎯 Scope

The following are **in scope** for security reports:

- Cross-site scripting (XSS) in the editor, preview, or rendered Markdown
- Authentication or session issues (better-auth)
- Workspace API authorization flaws (user A accessing user B's documents)
- Signed URL (R2) issues — URL leakage, expiry, or privilege escalation
- API-key or environment-variable leakage through the proxy layer
- Rate-limit bypasses
- Dependency vulnerabilities in the runtime bundle or Go modules
- Local storage or IndexedDB data leakage between origins

The following are **out of scope**:

- Attacks requiring physical access to the user's machine
- Social engineering attacks against project maintainers
- Theoretical vulnerabilities without a practical attack vector
- Issues in dependencies that are already patched in newer versions
- Misconfiguration of self-hosted deployments (documented in DEPLOYMENT.md)

## 🛡️ Safe Harbor

We will not pursue legal action against anyone who:

- Reports a vulnerability in accordance with this policy
- Engages in good-faith security research within the scope defined above
- Does not cause harm or violate applicable law

## 🙏 Acknowledgments

Because this application handles documents that may be private, personal, or confidential, we treat security vulnerabilities with the same seriousness as any data-handling application. We appreciate the community's help in keeping md-pdf-preview safe.