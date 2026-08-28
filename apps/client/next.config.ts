import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["md-pdf-preview.andrew-lenz.com"],
};

const withNextIntl = createNextIntlPlugin("./src/core/i18n/request.ts");

initOpenNextCloudflareForDev();

export default withNextIntl(nextConfig);
