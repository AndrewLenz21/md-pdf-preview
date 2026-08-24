# Privacy Notice

Last updated: 2026-08-24

This notice explains how md-pdf-preview handles information in the hosted service and in self-hosted deployments. The detailed Privacy Policy published in the hosted application is the canonical privacy notice for the hosted service. The hosted service is operated in Milan, Italy by Lenz Villanueva Andrew Angel Giovanny, sole proprietor trading as Bitnexus Lab (formal business name: Bitnexus Lab di Lenz Villanueva Andrew Angel Giovanny). Privacy contact: [privacy@bitnexuslab.com](mailto:privacy@bitnexuslab.com). The project is open source, so a self-hosted operator may configure additional services or policies.

## Local Workspace

When you use the client without signing in, documents and workspace metadata are stored in your browser's IndexedDB under the application origin. The project does not receive those documents through the cloud API in local-only mode.

Clearing browser site data, using private browsing, or changing browser profiles can remove local documents. Keep your own backups for important work.

## Cloud Workspace and Accounts

When you create an account or sign in and use Cloud features, the deployment may process:

- Account and authentication information managed by better-auth.
- OAuth information when Google or GitHub sign-in is enabled.
- Workspace folders, document metadata, and document contents.
- Verification and account-deletion confirmation email delivery information when those messages are sent.
- Operational request and error logs needed to run and protect the service.

The hosted deployment stores workspace metadata in PostgreSQL and document contents in Cloudflare R2. The hosted service uses Cloudflare for application delivery and R2 object storage, Supabase as its managed PostgreSQL provider, Resend for verification and account-deletion confirmation emails, and Google or GitHub when users choose those authentication methods. The production PostgreSQL database is hosted on AWS in the `eu-west-1` region (Europe – Ireland).

## Use of Information

Information is used to authenticate users, provide workspace synchronization, deliver verification and account-deletion confirmation emails, protect the service, troubleshoot failures, and maintain the application. The project does not sell document contents or use them for advertising.

## Retention and Deletion

The hosted service has several concrete retention and deletion mechanisms. Local browser workspace data remains until the user or browser removes it. PostgreSQL request logs and email-delivery records are retained for 30 days and then automatically deleted. Diagnostic log objects stored under the Cloudflare R2 `logs/` prefix are configured to expire automatically after 30 days. Sessions expire according to the configured session policy, currently up to approximately 7 days. Authenticated users can permanently delete their account from the application settings. After explicit confirmation, the service deletes the user's cloud workspace data and associated Cloudflare R2 document objects and then deletes the account through the authentication system. A deletion confirmation email may be sent after completion; its delivery record follows the 30-day email-delivery retention period. This action cannot be undone. Local-only documents stored in the browser are not automatically deleted because they are separate from the cloud account. Backup copies, where provided by the hosting provider, may temporarily retain deleted information according to the provider's backup lifecycle and are not used as active application data; the hosted service does not promise a specific backup deletion timeframe. Some information may need to be retained when required by law or necessary for the establishment, exercise, or defence of legal claims. Formal GDPR and privacy requests can be sent to [privacy@bitnexuslab.com](mailto:privacy@bitnexuslab.com). Self-hosted operators are responsible for defining and communicating their own account and backup retention policies.

## Third-Party Services

The hosted deployment uses Cloudflare, Supabase, Resend, Google, and GitHub depending on which features are enabled. Those services process information under their own privacy policies and current contractual terms. Some providers may process data outside the EEA. Where required, transfers rely on legally recognized mechanisms described in the relevant provider terms, such as adequacy decisions, Standard Contractual Clauses, or the EU-US Data Privacy Framework where applicable. Provider-specific safeguards and sub-processors are governed by their current agreements and policies.

## Changes

This notice may be updated as the application or hosted deployment changes. Updates will be published in this file.

## Contact

For privacy questions about the hosted service, contact [privacy@bitnexuslab.com](mailto:privacy@bitnexuslab.com). For general questions about the open-source project, open a documentation issue in the [GitHub repository](https://github.com/AndrewLenz21/md-pdf-preview). Self-hosted deployments have their own operator and privacy contact.
