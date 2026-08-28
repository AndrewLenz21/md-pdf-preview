import type { Pool } from "pg";
import { EMAIL_PROVIDER, EMAIL_PURPOSE } from "./emailDeliveries";
import { resolveEmailLocale } from "./emailContent";
import * as emailDeliveryRepository from "./emailDeliveryRepository";
import { reserveEmailDelivery } from "./emailQuota";
import {
  ResendSendError,
  sendAccountDeletionEmail as sendWithResend,
} from "./resendService";

type DeletedUser = {
  email: string;
  name: string;
};

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

export async function sendAccountDeletionConfirmationEmail(
  authPool: Pool,
  user: DeletedUser,
  deletionReference: string,
  request?: Request,
): Promise<void> {
  const reservation = await reserveEmailDelivery({
    authPool,
    email: user.email,
    purpose: EMAIL_PURPOSE.ACCOUNT_DELETION,
    provider: EMAIL_PROVIDER.RESEND,
  });

  try {
    const { providerMessageId } = await sendWithResend({
      to: user.email,
      name: user.name,
      locale: resolveEmailLocale(request),
      deletionReference,
      idempotencyKey: reservation.idempotencyKey,
    });

    await emailDeliveryRepository.markAccepted(authPool, {
      id: reservation.id,
      providerMessageId,
      userId: null,
    });
  } catch (error) {
    const described = describeSendError(error);

    await emailDeliveryRepository
      .markRequestFailed(authPool, {
        id: reservation.id,
        errorCode: described.code,
        errorMessage: described.message.slice(0, 500),
      })
      .catch((markError) => {
        console.error(
          "[accountDeletionEmail] delivery failure status update failed:",
          markError,
        );
      });

    throw error;
  }
}
