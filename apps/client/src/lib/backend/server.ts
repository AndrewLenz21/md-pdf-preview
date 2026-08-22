import "server-only";

import { headers } from "next/headers";

function requiredEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} must be configured.`);
  }

  return value;
}

const backendURL = requiredEnvironmentVariable("BACKEND_URL").replace(/\/+$/, "");
const internalAPIKey = requiredEnvironmentVariable("INTERNAL_API_KEY");

type RequestBody = unknown;

class AppServer {
  constructor(private readonly baseURL: string) {}

  async get(path: string, init?: RequestInit) {
    return this.request(path, { ...init, method: "GET" });
  }

  async post(path: string, body: RequestBody, init?: RequestInit) {
    return this.request(path, this.withJSONBody(body, init, "POST"));
  }

  async patch(path: string, body: RequestBody, init?: RequestInit) {
    return this.request(path, this.withJSONBody(body, init, "PATCH"));
  }

  async delete(path: string, init?: RequestInit) {
    return this.request(path, { ...init, method: "DELETE" });
  }

  private withJSONBody(body: RequestBody, init: RequestInit | undefined, method: string): RequestInit {
    const isJSONBody =
      body !== null &&
      typeof body === "object" &&
      !(body instanceof FormData) &&
      !(body instanceof Blob) &&
      !(body instanceof ArrayBuffer);

    return {
      ...init,
      method,
      headers: {
        ...(isJSONBody ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
      body: isJSONBody ? JSON.stringify(body) : (body as BodyInit | null | undefined),
    };
  }

  private async request(path: string, options: RequestInit): Promise<Response> {
    const cleanPath = path.replace(/^\/+/, "");
    const requestHeaders = new Headers(options.headers);
    requestHeaders.set("X-Api-Key", internalAPIKey);
    requestHeaders.set("X-Request-Time", new Date().toISOString());

    if (!requestHeaders.has("X-Forwarded-For")) {
      try {
        const requestHeadersFromNext = await headers();
        const clientIP =
          requestHeadersFromNext.get("cf-connecting-ip") ||
          requestHeadersFromNext.get("x-real-ip") ||
          requestHeadersFromNext.get("x-forwarded-for")?.split(",")[0].trim();

        if (clientIP) {
          requestHeaders.set("X-Forwarded-For", clientIP);
        }
      } catch (error) {
        console.error("[AppServer] request headers are unavailable:", error);
      }
    }

    try {
      const response = await fetch(`${this.baseURL}/${cleanPath}`, {
        ...options,
        headers: requestHeaders,
      });

      return response;
    } catch (error) {
      console.error(`[AppServer] ${options.method} ${path} failed:`, error);
      throw error;
    }
  }

  withUser(userID: string) {
    const withIdentity = (init?: RequestInit): RequestInit => {
      const requestHeaders = new Headers(init?.headers);
      requestHeaders.set("X-User-Id", userID);

      return { ...init, headers: requestHeaders };
    };

    return {
      get: (path: string, init?: RequestInit) => this.get(path, withIdentity(init)),
      post: (path: string, body: RequestBody, init?: RequestInit) => this.post(path, body, withIdentity(init)),
      patch: (path: string, body: RequestBody, init?: RequestInit) => this.patch(path, body, withIdentity(init)),
      delete: (path: string, init?: RequestInit) => this.delete(path, withIdentity(init)),
    };
  }
}

const appServer = new AppServer(backendURL);

export { appServer };
export default appServer;
