import { APIError } from "better-auth";
import type { Pool } from "pg";

import {
  EMAIL_ATTEMPT_ID_HEADER,
  EMAIL_DELIVERY_STATUS,
  EMAIL_PURPOSE,
  EMAIL_PROVIDER,
} from "./emailDeliveries";
import { resolveEmailLocale } from "./emailContent";
import * as emailDeliveryRepository from "./emailDeliveryRepository";
import { QuotaExceededError, reserveEmailDelivery } from "./emailQuota";
import {
  ResendSendError,
  sendPasswordResetEmail as resendSend,
} from "./resendService";

const DAILY_LIMIT_ERROR_BODY = {
  code: "DAILY_REGISTRATION_LIMIT_REACHED",
  message:
    "We've reached today's registration limit. Please try again tomorrow.",
};

interface PasswordResetUser {
  id: string;
  email: string;
  name: string;
}

async function resolveDeliverySlot(
  authPool: Pool,
  email: string,
  request?: Request,
): Promise<{ id: string; idempotencyKey: string }> {
  const attemptId = request?.headers.get(EMAIL_ATTEMPT_ID_HEADER);

  if (attemptId) {
    const row = await emailDeliveryRepository.getDeliveryById(
      authPool,
      attemptId,
    );

    if (
      !row ||
      row.status !== EMAIL_DELIVERY_STATUS.RESERVED ||
      row.purpose !== EMAIL_PURPOSE.PASSWORD_RESET
    ) {
      throw new APIError("BAD_REQUEST", {
        code: "EMAIL_DELIVERY_SLOT_UNAVAILABLE",
        message: "Email delivery slot is unavailable.",
      });
    }

    return { id: row.id, idempotencyKey: row.idempotencyKey };
  }

  try {
    const reservation = await reserveEmailDelivery({
      authPool,
      email,
      purpose: EMAIL_PURPOSE.PASSWORD_RESET,
      provider: EMAIL_PROVIDER.RESEND,
    });

    return { id: reservation.id, idempotencyKey: reservation.idempotencyKey };
  } catch (error) {
    if (error instanceof QuotaExceededError) {
      throw new APIError("TOO_MANY_REQUESTS", DAILY_LIMIT_ERROR_BODY);
    }

    throw error;
  }
}

function describeSendError(error: unknown) {
  if (error instanceof ResendSendError) {
    return { code: error.providerCode, message: error.message };
  }

  return {
    code: null,
    message:
      error instanceof Error ? error.message : "Unknown email send error.",
  };
}

export async function sendPasswordResetEmail(
  authPool: Pool,
  data: { user: PasswordResetUser; url: string; token: string },
  request?: Request,
): Promise<void> {
  const slot = await resolveDeliverySlot(authPool, data.user.email, request);

  try {
    const { providerMessageId } = await resendSend({
      to: data.user.email,
      name: data.user.name,
      locale: resolveEmailLocale(request),
      resetUrl: data.url,
      idempotencyKey: slot.idempotencyKey,
    });

    await emailDeliveryRepository.markAccepted(authPool, {
      id: slot.id,
      providerMessageId,
      userId: data.user.id,
    });
  } catch (error) {
    const described = describeSendError(error);

    await emailDeliveryRepository.markRequestFailed(authPool, {
      id: slot.id,
      errorCode: described.code,
      errorMessage: described.message.slice(0, 500),
    });

    throw new APIError("INTERNAL_SERVER_ERROR", {
      code: "PASSWORD_RESET_EMAIL_SEND_FAILED",
      message: "We couldn't send the password reset email. Please try again.",
    });
  }
}
