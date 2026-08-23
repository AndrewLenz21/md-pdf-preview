import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { routing } from "@/core/i18n";

const handleI18nRouting = createMiddleware(routing);

export function middleware(request: NextRequest) {
  return handleI18nRouting(request);
}

export const config = {
  matcher: ["/", "/(en|es|it)/:path*"],
};
