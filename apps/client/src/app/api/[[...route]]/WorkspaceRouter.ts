import { Hono } from "hono";
import type { Context } from "hono";

import { auth } from "@/core/auth";
import appServer from "@/lib/backend/server";

type WorkspaceEnv = {
  Variables: {
    userID: string;
  };
};

type WorkspaceContext = Context<WorkspaceEnv>;

const workspaceRouter = new Hono<WorkspaceEnv>();

workspaceRouter.use("*", async (context, next) => {
  let session;

  try {
    session = await auth.api.getSession({
      headers: context.req.raw.headers,
    });
  } catch (error) {
    console.error("[WorkspaceRouter] Better Auth session lookup failed:", error);
    return context.json(
      {
        code: "AUTH_SESSION_UNAVAILABLE",
        message: "Authentication service is unavailable.",
      },
      503,
    );
  }

  if (!session?.user?.id) {
    return context.json(
      {
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication is required.",
      },
      401,
    );
  }

  context.set("userID", session.user.id);
  return next();
});

workspaceRouter.get("/items", (context) =>
  proxyBackend(context, "GET /workspace/items", () =>
    appServer.withUser(context.get("userID")).get(`workspace/items${new URL(context.req.url).search}`),
  ),
);

workspaceRouter.post("/items", async (context) => {
  const body = await readJSONBody(context);
  if (!body.ok) {
    return body.response;
  }

  return proxyBackend(context, "POST /workspace/items", () =>
    appServer.withUser(context.get("userID")).post("workspace/items", body.value),
  );
});

workspaceRouter.get("/items/:itemID", (context) =>
  proxyBackend(context, "GET /workspace/items/:itemID", () =>
    appServer.withUser(context.get("userID")).get(`workspace/items/${context.req.param("itemID")}`),
  ),
);

workspaceRouter.patch("/items/:itemID", async (context) => {
  const body = await readJSONBody(context);
  if (!body.ok) {
    return body.response;
  }

  return proxyBackend(context, "PATCH /workspace/items/:itemID", () =>
    appServer
      .withUser(context.get("userID"))
      .patch(`workspace/items/${context.req.param("itemID")}`, body.value),
  );
});

workspaceRouter.delete("/items/:itemID", (context) =>
  proxyBackend(context, "DELETE /workspace/items/:itemID", () =>
    appServer.withUser(context.get("userID")).delete(`workspace/items/${context.req.param("itemID")}`),
  ),
);

workspaceRouter.post("/documents/:documentID/upload-url", async (context) => {
  const body = await readJSONBody(context);
  if (!body.ok) {
    return body.response;
  }

  return proxyBackend(context, "POST /workspace/documents/:documentID/upload-url", () =>
    appServer
      .withUser(context.get("userID"))
      .post(`workspace/documents/${context.req.param("documentID")}/upload-url`, body.value),
  );
});

workspaceRouter.get("/documents/:documentID/download-url", (context) =>
  proxyBackend(context, "GET /workspace/documents/:documentID/download-url", () =>
    appServer
      .withUser(context.get("userID"))
      .get(`workspace/documents/${context.req.param("documentID")}/download-url`),
  ),
);

async function readJSONBody(context: WorkspaceContext) {
  try {
    return { ok: true as const, value: await context.req.json() };
  } catch (error) {
    console.error("[WorkspaceRouter] invalid JSON request body:", error);
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

async function proxyBackend(
  context: WorkspaceContext,
  operation: string,
  request: () => Promise<Response>,
) {
  try {
    const response = await request();

    if (response.status >= 500) {
      console.error(`[WorkspaceRouter] ${operation} returned ${response.status}`);
    }

    return new Response(response.body, {
      status: response.status,
      headers: forwardResponseHeaders(response.headers),
    });
  } catch (error) {
    console.error(`[WorkspaceRouter] ${operation} backend request failed:`, error);
    return context.json(
      {
        code: "BACKEND_UNAVAILABLE",
        message: "Backend service is unavailable.",
      },
      503,
    );
  }
}

function forwardResponseHeaders(source: Headers) {
  const target = new Headers();

  for (const header of ["content-type", "content-disposition", "x-request-id"]) {
    const value = source.get(header);
    if (value) {
      target.set(header, value);
    }
  }

  return target;
}

export default workspaceRouter;
