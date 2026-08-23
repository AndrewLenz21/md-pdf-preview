import { Hono } from "hono";
import { Webhook } from "svix";

import { WEBHOOK_EVENT_STATUS } from "@/core/auth/email/emailDeliveries";
import * as emailDeliveryRepository from "@/core/auth/email/emailDeliveryRepository";
import { authPool } from "@/core/auth/pool";

const resendWebhookRouter = new Hono();

resendWebhookRouter.post("/", async (context) => {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();

  if (!secret) {
    console.warn(
      "[ResendWebhookRouter] RESEND_WEBHOOK_SECRET is not configured; ignoring webhook.",
    );
    return context.json(
      {
        code: "WEBHOOK_NOT_CONFIGURED",
        message: "Resend webhook secret is not configured.",
      },
      503,
    );
  }

  const payload = await context.req.text();

  let event: { type?: unknown; data?: unknown };

  try {
    event = new Webhook(secret).verify(payload, {
      "svix-id": context.req.header("svix-id") ?? "",
      "svix-timestamp": context.req.header("svix-timestamp") ?? "",
      "svix-signature": context.req.header("svix-signature") ?? "",
    }) as { type?: unknown; data?: unknown };
  } catch (error) {
    console.error(
      "[ResendWebhookRouter] webhook signature verification failed:",
      error,
    );
    return context.json(
      { code: "INVALID_WEBHOOK_SIGNATURE", message: "Invalid webhook signature." },
      400,
    );
  }

  const status =
    typeof event.type === "string" ? WEBHOOK_EVENT_STATUS[event.type] : undefined;
  const providerMessageId = (event.data as { id?: unknown } | undefined)?.id;

  if (!status || typeof providerMessageId !== "string") {
    return context.json(
      { code: "WEBHOOK_EVENT_IGNORED", message: "Webhook event ignored." },
      200,
    );
  }

  const deliveredAt =
    event.type === "email.delivered" ? new Date() : undefined;

  const result = await emailDeliveryRepository.applyWebhookStatus(authPool, {
    providerMessageId,
    status,
    deliveredAt,
  });

  if (result === "missing") {
    console.warn(
      `[ResendWebhookRouter] no delivery row for provider message id: ${providerMessageId}`,
    );
  }

  return context.json({ received: true }, 200);
});

export default resendWebhookRouter;
