/*=============================================================================
 * 🌐 MAIN API CATCH-ALL ROUTER
 *=============================================================================
 * Next.js App Router catch-all route ([[...route]]) powered by the Hono framework.
 * Delegates incoming API requests to their respective specialized sub-routers.
 *=============================================================================*/

/*===== 📦 IMPORTS & SETUP =====*/
import { Hono } from "hono";

import { withRequestAuth } from "@/lib/server/request-auth";

import authEmailRouter from "./AuthEmailRouter";
import resendWebhookRouter from "./ResendWebhookRouter";
import workspaceRouter from "./WorkspaceRouter";

const app = new Hono().basePath("/api");

// 📧 Mount email auth endpoints under /api/auth
app.route("/auth", authEmailRouter);

// 🔐 Catch-all for remaining Better Auth endpoints (e.g. session checks, OAuth callbacks)
app.all("/auth/*", async (context) => {
  return withRequestAuth(async ({ auth }) => auth.handler(context.req.raw));
});

app.route("/workspace", workspaceRouter); // 📁 Mount workspace management routes under /api/workspace
app.route("/webhooks/resend", resendWebhookRouter); // 🔔 Mount Resend webhook handler under /api/webhooks/resend

// ⛔ Fallback handler for unhandled errors during API execution
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

/*===== 🚀 NEXT.JS HTTP HANDLER EXPORT =====*/
const handle = (request: Request) => app.fetch(request);

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as DELETE,
  handle as PATCH,
};
