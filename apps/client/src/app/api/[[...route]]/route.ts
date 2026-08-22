import { Hono } from "hono";
import { handle } from "hono/vercel";

import { auth } from "@/core/auth";
import workspaceRouter from "./WorkspaceRouter";

export const runtime = "nodejs";

const app = new Hono().basePath("/api");

app.all("/auth/*", (context) => auth.handler(context.req.raw));
app.route("/workspace", workspaceRouter);

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

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
