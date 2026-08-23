# Privacy Notice

Last updated: 2026-08-24

This notice explains how md-pdf-preview handles information in the hosted service and in self-hosted deployments. The hosted service is operated in Italy by Lenz Villanueva Andrew Angel Giovanny, sole proprietor trading as Bitnexus Lab. Privacy contact: [privacy@bitnexuslab.com](mailto:privacy@bitnexuslab.com). The project is open source, so a self-hosted operator may configure additional services or policies.

## Local Workspace

When you use the client without signing in, documents and workspace metadata are stored in your browser's IndexedDB under the application origin. The project does not receive those documents through the cloud API in local-only mode.

Clearing browser site data, using private browsing, or changing browser profiles can remove local documents. Keep your own backups for important work.

## Cloud Workspace and Accounts

When you create an account or sign in and use Cloud features, the deployment may process:

- Account and authentication information managed by better-auth.
- OAuth information when Google or GitHub sign-in is enabled.
- Workspace folders, document metadata, and document contents.
- Verification email delivery information when email verification is enabled.
- Operational request and error logs needed to run and protect the service.

The hosted deployment stores workspace metadata in PostgreSQL and document contents in Cloudflare R2. Authentication and email delivery may use the providers configured by the deployment operator.

## Use of Information

Information is used to authenticate users, provide workspace synchronization, deliver verification emails, protect the service, troubleshoot failures, and maintain the application. The project does not sell document contents or use them for advertising.

## Retention and Deletion

Local data remains in the browser until the user or browser removes it. PostgreSQL request logs and email-delivery records are retained for 30 days and then automatically deleted. Cloud documents remain until they are deleted through the application or by the operator's retention policy. Self-hosted operators are responsible for defining and communicating account and backup retention policies.

## Third-Party Services

The hosted deployment may use Cloudflare, PostgreSQL hosting, Resend, Google, and GitHub depending on which features are enabled. Those services process information under their own privacy policies.

## Changes

This notice may be updated as the application or hosted deployment changes. Updates will be published in this file.

## Contact

For privacy questions about the hosted service, contact [privacy@bitnexuslab.com](mailto:privacy@bitnexuslab.com). For general questions about the open-source project, open a documentation issue in the [GitHub repository](https://github.com/AndrewLenz21/md-pdf-preview). Self-hosted deployments have their own operator and privacy contact.
