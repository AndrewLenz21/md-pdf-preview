import type { NextConfig } from "next";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  reactCompiler: true,

  allowedDevOrigins: ["md-pdf-preview.andrew-lenz.com"],

  outputFileTracingIncludes: {
    "**/*": [
      "./node_modules/pg-cloudflare/dist/**",
      "./node_modules/pg-cloudflare/esm/**",
    ],
  },
};

const withNextIntl = createNextIntlPlugin("./src/core/i18n/request.ts");

initOpenNextCloudflareForDev();

export default withNextIntl(nextConfig);
