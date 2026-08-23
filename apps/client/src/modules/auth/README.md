# 🔐 Auth

Module responsible for user identity and access screens.

| Area | Responsibility |
| --- | --- |
| `components/` | Shell, sign-in/sign-up forms, and Google/GitHub buttons |
| `services/` | Sign-in, sign-up, and verification email delivery |
| `messages/` | English, Spanish, and Italian translations |
| `i18n.ts` | Auth-domain message configuration |

## 🔄 Main flow

1. The user completes a form or chooses an OAuth provider.
2. The service calls Better Auth through `authClient`.
3. The result updates the session and redirects to the dashboard.
4. Errors are converted into localized messages.

## 🧪 Notes

- Better Auth configuration lives in `src/core/auth/`.
- OAuth secrets must remain in server-only environment variables.
- Services contain reusable logic; components only coordinate the UI.
