/*=============================================================================
 * 📁 WORKSPACE ROUTER
 *=============================================================================
 * Proxies client workspace requests (workspace items & document management)
 * to the backend application server while enforcing session authentication.
 *=============================================================================*/

/*===== 📦 IMPORTS =====*/
import { Hono } from "hono";
import type { Context } from "hono";

import appServer from "@/lib/backend/server";
import { readJSONBody } from "@/lib/server/hono";
import { withRequestAuth } from "@/lib/server/request-auth";

/*===== ⚙️ TYPES & ROUTER SETUP =====*/

// Hono environment context storing the authenticated user ID
type WorkspaceEnv = {
  Variables: {
    userID: string;
  };
};

type WorkspaceContext = Context<WorkspaceEnv>;

const workspaceRouter = new Hono<WorkspaceEnv>();

/*===== 🔑 AUTHENTICATION MIDDLEWARE =====*/

/**
 * 🔒 Protects all workspace endpoints by verifying the session token with Better Auth.
 * Sets the authenticated `userID` in the context variables or rejects unauthenticated requests.
 */
workspaceRouter.use("*", (context, next) =>
  withRequestAuth(async ({ auth }) => {
    let session;

    try {
      session = await auth.api.getSession({
        headers: context.req.raw.headers,
      });
    } catch (error) {
      console.error(
        "[WorkspaceRouter] Better Auth session lookup failed:",
        error,
      );
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
    return await next();
  }),
);

/*===== 📝 WORKSPACE ITEMS API ENDPOINTS =====*/

/**
 * 📋 GET /items - List all workspace items for the current user
 */
workspaceRouter.get("/items", (context) =>
  proxyBackend(context, "GET /workspace/items", () =>
    appServer
      .withUser(context.get("userID"))
      .get(`workspace/items${new URL(context.req.url).search}`),
  ),
);

/**
 * ➕ POST /items - Create a new item in the user's workspace
 */
workspaceRouter.post("/items", async (context) => {
  const body = await readJSONBody(context, "WorkspaceRouter");
  if (!body.ok) {
    return body.response;
  }

  return proxyBackend(context, "POST /workspace/items", () =>
    appServer
      .withUser(context.get("userID"))
      .post("workspace/items", body.value),
  );
});

/**
 * 🔍 GET /items/:itemID - Fetch details for a specific workspace item
 */
workspaceRouter.get("/items/:itemID", (context) =>
  proxyBackend(context, "GET /workspace/items/:itemID", () =>
    appServer
      .withUser(context.get("userID"))
      .get(`workspace/items/${context.req.param("itemID")}`),
  ),
);

/**
 * ✏️ PATCH /items/:itemID - Update an existing workspace item
 */
workspaceRouter.patch("/items/:itemID", async (context) => {
  const body = await readJSONBody(context, "WorkspaceRouter");
  if (!body.ok) {
    return body.response;
  }

  return proxyBackend(context, "PATCH /workspace/items/:itemID", () =>
    appServer
      .withUser(context.get("userID"))
      .patch(`workspace/items/${context.req.param("itemID")}`, body.value),
  );
});

/**
 * 🗑️ DELETE /items/:itemID - Delete a workspace item
 */
workspaceRouter.delete("/items/:itemID", (context) =>
  proxyBackend(context, "DELETE /workspace/items/:itemID", () =>
    appServer
      .withUser(context.get("userID"))
      .delete(`workspace/items/${context.req.param("itemID")}`),
  ),
);

/*===== 📄 WORKSPACE DOCUMENTS API ENDPOINTS =====*/

/**
 * 📤 POST /documents/:documentID/upload-url - Generate presigned URL for document upload
 */
workspaceRouter.post("/documents/:documentID/upload-url", async (context) => {
  const body = await readJSONBody(context, "WorkspaceRouter");
  if (!body.ok) {
    return body.response;
  }

  return proxyBackend(
    context,
    "POST /workspace/documents/:documentID/upload-url",
    () =>
      appServer
        .withUser(context.get("userID"))
        .post(
          `workspace/documents/${context.req.param("documentID")}/upload-url`,
          body.value,
        ),
  );
});

/**
 * ✅ POST /documents/:documentID/upload-complete - Notify backend that document upload completed
 */
workspaceRouter.post(
  "/documents/:documentID/upload-complete",
  async (context) => {
    const body = await readJSONBody(context, "WorkspaceRouter");
    if (!body.ok) {
      return body.response;
    }

    return proxyBackend(
      context,
      "POST /workspace/documents/:documentID/upload-complete",
      () =>
        appServer
          .withUser(context.get("userID"))
          .post(
            `workspace/documents/${context.req.param("documentID")}/upload-complete`,
            body.value,
          ),
    );
  },
);

/**
 * 📥 GET /documents/:documentID/download-url - Get pre-signed download URL for a document
 */
workspaceRouter.get("/documents/:documentID/download-url", (context) =>
  proxyBackend(
    context,
    "GET /workspace/documents/:documentID/download-url",
    () =>
      appServer
        .withUser(context.get("userID"))
        .get(
          `workspace/documents/${context.req.param("documentID")}/download-url`,
        ),
  ),
);

/*===== 🔄 BACKEND PROXY HELPER & HEADERS =====*/

/**
 * Helper function to forward client API requests to the internal backend app server,
 * standardizing error handling and header forwarding.
 */
async function proxyBackend(
  context: WorkspaceContext,
  operation: string,
  request: () => Promise<Response>,
) {
  try {
    const response = await request();

    if (response.status >= 500) {
      console.error(
        `[WorkspaceRouter] ${operation} returned ${response.status}`,
      );
    }

    return new Response(response.body, {
      status: response.status,
      headers: forwardResponseHeaders(response.headers),
    });
  } catch (error) {
    console.error(
      `[WorkspaceRouter] ${operation} backend request failed:`,
      error,
    );
    return context.json(
      {
        code: "BACKEND_UNAVAILABLE",
        message: "Backend service is unavailable.",
      },
      503,
    );
  }
}

/**
 * Selectively forwards response headers from backend responses (e.g. content-type, content-disposition).
 */
function forwardResponseHeaders(source: Headers) {
  const target = new Headers();

  for (const header of [
    "content-type",
    "content-disposition",
    "x-request-id",
  ]) {
    const value = source.get(header);
    if (value) {
      target.set(header, value);
    }
  }

  return target;
}

/*===== 📤 ROUTER EXPORT =====*/
export default workspaceRouter;

