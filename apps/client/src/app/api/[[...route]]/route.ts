import { Hono } from "hono";

import { createAuth } from "@/core/auth/auth";

import authEmailRouter from "./AuthEmailRouter";
import resendWebhookRouter from "./ResendWebhookRouter";
import workspaceRouter from "./WorkspaceRouter";

const app = new Hono().basePath("/api");

app.route("/auth", authEmailRouter);

app.all("/auth/*", async (context) => {
  const { auth, authPool } = createAuth();

  try {
    return await auth.handler(context.req.raw);
  } finally {
    await authPool.end();
  }
});

app.route("/workspace", workspaceRouter);

app.route("/webhooks/resend", resendWebhookRouter);

app.onError((error, context) => {
  console.error("[ApiRouter] unhandled API error:", error);

  return context.json(
    {
      code: "INTERNAL_API_ERROR",
      message: "Internal API error.",
    },
    500,
  );
});

const handle = (request: Request) => app.fetch(request);

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as DELETE,
  handle as PATCH,
};
