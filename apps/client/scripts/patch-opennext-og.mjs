import fs from "node:fs";
import path from "node:path";

// OpenNext generates the deployable bundle inside `.open-next`.
const root = path.resolve(".open-next");

function patchDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    // Recursively scan all generated OpenNext directories.
    if (entry.isDirectory()) {
      patchDirectory(fullPath);
      continue;
    }

    // Only patch generated ESM JavaScript files.
    if (!entry.name.endsWith(".mjs")) continue;

    const source = fs.readFileSync(fullPath, "utf8");

    // Remove the unused dynamic import of @vercel/og.
    // This prevents resvg.wasm and related OG dependencies
    // from being bundled into the Cloudflare Worker.
    const patched = source.replaceAll(
      'import("next/dist/compiled/@vercel/og/index.edge.js")',
      'Promise.reject(new Error("@vercel/og disabled"))',
    );

    // Write the file only when a matching import was found.
    if (patched !== source) {
      fs.writeFileSync(fullPath, patched);
      console.log(`✅ Removed unused @vercel/og from ${fullPath}`);
    }
  }
}

patchDirectory(root);