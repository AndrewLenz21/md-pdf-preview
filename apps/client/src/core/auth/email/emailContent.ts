export const EMAIL_LOCALES = ["en", "es", "it"] as const;

export type EmailLocale = (typeof EMAIL_LOCALES)[number];

const FALLBACK_GREETING: Record<EmailLocale, string> = {
  en: "there",
  es: "amigo/a",
  it: "amico/a",
};

/**
 * Resolves the email language from the `accept-language` header of the
 * request that triggered the send (the client sets it to the app locale).
 */
export function resolveEmailLocale(request?: Request): EmailLocale {
  const header = request?.headers.get("accept-language") ?? "";

  for (const part of header.split(",")) {
    const tag = (part.split(";")[0] ?? "").trim().toLowerCase();
    const base = tag.split("-")[0] ?? "";

    if ((EMAIL_LOCALES as readonly string[]).includes(base)) {
      return base as EmailLocale;
    }
  }

  return "en";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface EmailCopy {
  subject: string;
  greeting: string;
  welcome: string;
  action: string;
  button: string;
  fallback: string;
  expires: string;
}

interface PasswordResetEmailCopy {
  subject: string;
  greeting: string;
  action: string;
  button: string;
  fallback: string;
  expires: string;
}

interface AccountDeletionEmailCopy {
  subject: string;
  greeting: string;
  completed: string;
  reference: string;
  localDocuments: string;
  support: string;
}

const CONTENT: Record<EmailLocale, EmailCopy> = {
  en: {
    subject: "Verify your email address",
    greeting: "Hi {name},",
    welcome:
      "I'm Andrew. Thank you for giving my application a chance — I hope it's useful in your day-to-day.",
    action: "To activate your account, please verify your email address:",
    button: "Verify my email",
    fallback:
      "If the button doesn't work, copy and paste this link into your browser:",
    expires: "This link is valid for 1 hour.",
  },
  es: {
    subject: "Verifica tu correo electrónico",
    greeting: "¡Hola {name}!",
    welcome:
      "Soy Andrew. Gracias por darle una oportunidad a mi aplicación; espero que te sea útil en tu día a día.",
    action: "Para activar tu cuenta, verifica tu correo electrónico:",
    button: "Verificar mi correo",
    fallback:
      "Si el botón no funciona, copia y pega este enlace en tu navegador:",
    expires: "El enlace es válido durante 1 hora.",
  },
  it: {
    subject: "Verifica il tuo indirizzo email",
    greeting: "Ciao {name},",
    welcome:
      "Sono Andrew. Grazie per aver dato una possibilità alla mia applicazione: spero che ti sia utile nella vita di tutti i giorni.",
    action: "Per attivare il tuo account, verifica il tuo indirizzo email:",
    button: "Verifica la mia email",
    fallback:
      "Se il pulsante non funziona, copia e incolla questo link nel browser:",
    expires: "Il link è valido per 1 ora.",
  },
};

const PASSWORD_RESET_CONTENT: Record<EmailLocale, PasswordResetEmailCopy> = {
  en: {
    subject: "Reset your password",
    greeting: "Hi {name},",
    action: "Use the link below to choose a new password for your account:",
    button: "Reset my password",
    fallback: "If the button doesn't work, copy and paste this link into your browser:",
    expires: "This link is valid for 1 hour.",
  },
  es: {
    subject: "Restablece tu contraseña",
    greeting: "¡Hola {name}!",
    action: "Usa el siguiente enlace para elegir una nueva contraseña para tu cuenta:",
    button: "Restablecer mi contraseña",
    fallback: "Si el botón no funciona, copia y pega este enlace en tu navegador:",
    expires: "El enlace es válido durante 1 hora.",
  },
  it: {
    subject: "Reimposta la tua password",
    greeting: "Ciao {name},",
    action: "Usa il link seguente per scegliere una nuova password per il tuo account:",
    button: "Reimposta la mia password",
    fallback: "Se il pulsante non funziona, copia e incolla questo link nel browser:",
    expires: "Il link è valido per 1 ora.",
  },
};

const ACCOUNT_DELETION_CONTENT: Record<EmailLocale, AccountDeletionEmailCopy> = {
  en: {
    subject: "Your account has been deleted",
    greeting: "Hi {name},",
    completed:
      "Your MarkDown Preview account and its cloud-synced workspace have been permanently deleted.",
    reference: "Deletion reference: {reference}",
    localDocuments:
      "Documents stored only in this browser were not affected.",
    support:
      "Keep this reference if you need to contact support about the deletion.",
  },
  es: {
    subject: "Tu cuenta ha sido eliminada",
    greeting: "¡Hola {name}!",
    completed:
      "Tu cuenta de MarkDown Preview y su espacio de trabajo sincronizado en la nube se han eliminado permanentemente.",
    reference: "Referencia de eliminación: {reference}",
    localDocuments:
      "Los documentos almacenados únicamente en este navegador no se han modificado.",
    support:
      "Conserva esta referencia si necesitas contactar con soporte sobre la eliminación.",
  },
  it: {
    subject: "Il tuo account è stato eliminato",
    greeting: "Ciao {name},",
    completed:
      "Il tuo account MarkDown Preview e il relativo spazio di lavoro sincronizzato nel cloud sono stati eliminati definitivamente.",
    reference: "Riferimento eliminazione: {reference}",
    localDocuments:
      "I documenti salvati solo in questo browser non sono stati modificati.",
    support:
      "Conserva questo riferimento se devi contattare il supporto per l'eliminazione.",
  },
};

export function buildVerificationEmailContent({
  locale,
  name,
  verificationUrl,
}: {
  locale: EmailLocale;
  name: string;
  verificationUrl: string;
}): { subject: string; html: string } {
  const copy = CONTENT[locale];
  const displayName = name.trim() || FALLBACK_GREETING[locale];
  const safeUrl = escapeHtml(verificationUrl);

  const html = [
    `<p>${escapeHtml(copy.greeting.replace("{name}", displayName))}</p>`,
    `<p>${escapeHtml(copy.welcome)}</p>`,
    `<p>${escapeHtml(copy.action)}</p>`,
    `<p style="margin: 24px 0;">`,
    `<a href="${safeUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600;">${escapeHtml(copy.button)}</a>`,
    `</p>`,
    `<p style="color: #6b7280; font-size: 14px;">${escapeHtml(copy.fallback)}<br />${safeUrl}</p>`,
    `<p style="color: #6b7280; font-size: 14px;">${escapeHtml(copy.expires)}</p>`,
  ].join("\n");

  return {
    subject: copy.subject,
    html: `<div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.6;">${html}</div>`,
  };
}

export function buildPasswordResetEmailContent({
  locale,
  name,
  resetUrl,
}: {
  locale: EmailLocale;
  name: string;
  resetUrl: string;
}): { subject: string; html: string } {
  const copy = PASSWORD_RESET_CONTENT[locale];
  const displayName = name.trim() || FALLBACK_GREETING[locale];
  const safeUrl = escapeHtml(resetUrl);

  const html = [
    `<p>${escapeHtml(copy.greeting.replace("{name}", displayName))}</p>`,
    `<p>${escapeHtml(copy.action)}</p>`,
    `<p style="margin: 24px 0;">`,
    `<a href="${safeUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600;">${escapeHtml(copy.button)}</a>`,
    `</p>`,
    `<p style="color: #6b7280; font-size: 14px;">${escapeHtml(copy.fallback)}<br />${safeUrl}</p>`,
    `<p style="color: #6b7280; font-size: 14px;">${escapeHtml(copy.expires)}</p>`,
  ].join("\n");

  return {
    subject: copy.subject,
    html: `<div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.6;">${html}</div>`,
  };
}

export function buildAccountDeletionEmailContent({
  locale,
  name,
  deletionReference,
}: {
  locale: EmailLocale;
  name: string;
  deletionReference: string;
}): { subject: string; html: string } {
  const copy = ACCOUNT_DELETION_CONTENT[locale];
  const displayName = name.trim() || FALLBACK_GREETING[locale];
  const greeting = escapeHtml(copy.greeting.replace("{name}", displayName));
  const completed = escapeHtml(copy.completed);
  const reference = escapeHtml(
    copy.reference.replace("{reference}", deletionReference),
  );
  const localDocuments = escapeHtml(copy.localDocuments);
  const support = escapeHtml(copy.support);

  const html = [
    `<p>${greeting}</p>`,
    `<p>${completed}</p>`,
    `<p><strong>${reference}</strong></p>`,
    `<p>${localDocuments}</p>`,
    `<p style="color: #6b7280; font-size: 14px;">${support}</p>`,
  ].join("\n");

  return {
    subject: copy.subject,
    html: `<div style="font-family: Arial, Helvetica, sans-serif; color: #111827; line-height: 1.6;">${html}</div>`,
  };
}
