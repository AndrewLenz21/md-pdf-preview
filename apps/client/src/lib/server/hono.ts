import "server-only";

import type { Context } from "hono";

type JSONBodyContext = Pick<Context, "req" | "json">;

export async function readJSONBody<T = unknown>(
  context: JSONBodyContext,
  loggerName: string,
) {
  try {
    return {
      ok: true as const,
      value: (await context.req.json()) as T,
    };
  } catch (error) {
    console.error(`[${loggerName}] invalid JSON request body:`, error);
    return {
      ok: false as const,
      response: context.json(
        {
          code: "INVALID_REQUEST_BODY",
          message: "Request body must be valid JSON.",
        },
        400,
      ),
    };
  }
}
