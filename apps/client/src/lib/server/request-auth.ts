import "server-only";

import { createAuth } from "@/core/auth/auth";

export type RequestAuth = Awaited<ReturnType<typeof createAuth>>;

export async function withRequestAuth<T>(
  operation: (requestAuth: RequestAuth) => Promise<T>,
): Promise<T> {
  const requestAuth = await createAuth();

  try {
    return await operation(requestAuth);
  } finally {
    await requestAuth.authPool.end();
  }
}
