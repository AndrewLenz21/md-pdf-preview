import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Pool } from "pg";

const DEFAULT_DATABASE_SCHEMA = "your_schema";
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
  const databaseSchema = getDatabaseSchema();
  const connectionUrl = new URL(cloudflareEnv.HYPERDRIVE.connectionString);

  connectionUrl.searchParams.set("options", `-c search_path=${databaseSchema}`);

  return new Pool({
    connectionString: connectionUrl.toString(),
    maxUses: 1,
  });
}
