import { Hono } from "hono";
import { handle } from "hono/vercel";

import { auth } from "@/core/auth";

export const runtime = "nodejs";

const app = new Hono().basePath("/api");

app.all("/auth/*", (context) => auth.handler(context.req.raw));

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
