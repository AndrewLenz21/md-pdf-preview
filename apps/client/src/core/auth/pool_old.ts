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

export function createAuthPool(): Pool {
  const databaseUrl = requiredEnvironmentVariable("DATABASE_URL");
  const databaseConnectionUrl = new URL(databaseUrl);

  // pg lets URL SSL options override the TLS object, so configure TLS explicitly.
  databaseConnectionUrl.searchParams.delete("sslmode");

  return new Pool({
    connectionString: databaseConnectionUrl.toString(),
    options: `-c search_path=${getDatabaseSchema()}`,
    // Supabase poolers require TLS but do not provide a Node-trusted CA chain.
    ssl: {
      rejectUnauthorized: false,
    },
    // Worker isolates must not reuse a TCP connection across requests.
    maxUses: 1,
  });
}

/**
 * Temporary compatibility export. Remove after all consumers use
 * createAuthPool() with request-scoped auth.
 */
const globalForAuth = globalThis as typeof globalThis & {
  authPool?: Pool;
};

export const authPool = globalForAuth.authPool ?? createAuthPool();

if (process.env.NODE_ENV !== "production") {
  globalForAuth.authPool = authPool;
}
