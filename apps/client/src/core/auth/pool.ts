import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Pool } from "pg";

const DEFAULT_DATABASE_SCHEMA = "app2";
const DATABASE_SCHEMA_PATTERN = /^[a-z_][a-z0-9_]*$/;

export function requiredEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} must be configured.`);
  }

  return value;
}

function getDatabaseSchema() {
  const schema = process.env.DB_SCHEMA?.trim() || DEFAULT_DATABASE_SCHEMA;

  if (!DATABASE_SCHEMA_PATTERN.test(schema)) {
    throw new Error("DB_SCHEMA must be a valid PostgreSQL schema identifier.");
  }

  return schema;
}

/**
 * Request-scoped pool for Cloudflare Workers.
 * Hyperdrive handles the underlying connection pooling.
 */
export function createAuthPool(): Pool {
  const { env } = getCloudflareContext();

  // OpenNext's CloudflareEnv does not include project-specific Wrangler bindings.
  type AppCloudflareEnv = typeof env & {
    HYPERDRIVE: {
      connectionString: string;
    };
  };

  const cloudflareEnv = env as AppCloudflareEnv;
  const connectionUrl = new URL(cloudflareEnv.HYPERDRIVE.connectionString);

  connectionUrl.searchParams.set(
    "options",
    `-c search_path=${getDatabaseSchema()}`,
  );

  return new Pool({
    connectionString: connectionUrl.toString(),
    maxUses: 1,
  });
}

/**
 * Temporary compatibility pool.
 * Still uses DATABASE_URL directly for consumers that have not yet
 * migrated to request-scoped Hyperdrive access.
 */
function createLegacyAuthPool(): Pool {
  const databaseUrl = requiredEnvironmentVariable("DATABASE_URL");
  const databaseConnectionUrl = new URL(databaseUrl);

  databaseConnectionUrl.searchParams.delete("sslmode");

  return new Pool({
    connectionString: databaseConnectionUrl.toString(),
    options: `-c search_path=${getDatabaseSchema()}`,
    ssl: {
      rejectUnauthorized: false,
    },
    maxUses: 1,
  });
}

/**
 * Temporary compatibility export.
 * Remove after all consumers use createAuthPool().
 */
const globalForAuth = globalThis as typeof globalThis & {
  authPool?: Pool;
};

export const authPool = globalForAuth.authPool ?? createLegacyAuthPool();

if (process.env.NODE_ENV !== "production") {
  globalForAuth.authPool = authPool;
}
