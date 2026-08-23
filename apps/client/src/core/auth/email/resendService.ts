import { Resend } from "resend";

import { requiredEnvironmentVariable } from "../pool";
import {
  buildVerificationEmailContent,
  type EmailLocale,
} from "./emailContent";

export class ResendSendError extends Error {
  constructor(
    readonly providerCode: string | null,
    readonly statusCode: number | null,
    message: string,
  ) {
    super(message);
    this.name = "ResendSendError";
  }
}

const resendApiKey = requiredEnvironmentVariable("RESEND_API_KEY");
const resendFromAddress = requiredEnvironmentVariable("RESEND_EMAIL_FROM");

const resend = new Resend(resendApiKey);

const MAX_SEND_ATTEMPTS = 2;

export async function sendVerificationEmail(input: {
  to: string;
  name: string;
  locale: EmailLocale;
  verificationUrl: string;
  idempotencyKey: string;
}): Promise<{ providerMessageId: string }> {
  const { subject, html } = buildVerificationEmailContent(input);

  let lastError: ResendSendError | null = null;

  for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt += 1) {
    let result: {
      data: { id: string } | null;
      error: ResendSendError | null;
    };

    try {
      const response = await resend.emails.send(
        { from: resendFromAddress, to: [input.to], subject, html },
        { idempotencyKey: input.idempotencyKey },
      );

      result = response.error
        ? {
            data: null,
            error: new ResendSendError(
              response.error.name ?? null,
              response.error.statusCode ?? null,
              response.error.message,
            ),
          }
        : { data: response.data as { id: string }, error: null };
    } catch (error) {
      result = {
        data: null,
        error: new ResendSendError(
          null,
          null,
          error instanceof Error ? error.message : "Unknown network failure.",
        ),
      };
    }

    if (result.data) {
      return { providerMessageId: result.data.id };
    }

    if (!result.error) {
      throw new ResendSendError(
        null,
        null,
        "Unable to send the verification email.",
      );
    }

    lastError = result.error;

    // Retry only transient failures (network errors or provider 5xx) with
    // the SAME idempotency key so retries can never duplicate the email.
    const isTransient =
      result.error.statusCode === null || result.error.statusCode >= 500;

    if (!isTransient) {
      throw result.error;
    }
  }

  throw (
    lastError ??
    new ResendSendError(null, null, "Unable to send the verification email.")
  );
}
