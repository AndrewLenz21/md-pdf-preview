import { betterAuth } from "better-auth";
import { Pool } from "pg";

const DEFAULT_DATABASE_SCHEMA = "app2";
const DATABASE_SCHEMA_PATTERN = /^[a-z_][a-z0-9_]*$/;

function requiredEnvironmentVariable(name: string) {
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

const databaseUrl = requiredEnvironmentVariable("DATABASE_URL");
const databaseSchema = getDatabaseSchema();
const authSecret = requiredEnvironmentVariable("BETTER_AUTH_SECRET");
const authUrl = requiredEnvironmentVariable("BETTER_AUTH_URL");
const databaseConnectionUrl = new URL(databaseUrl);

// pg lets URL SSL options override the TLS object, so configure TLS explicitly.
databaseConnectionUrl.searchParams.delete("sslmode");

if (authSecret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
}

new URL(authUrl);

const globalForAuth = globalThis as typeof globalThis & {
  authPool?: Pool;
};

const pool =
  globalForAuth.authPool ??
  new Pool({
    connectionString: databaseConnectionUrl.toString(),
    options: `-c search_path=${databaseSchema}`,
    // Supabase poolers require TLS but do not provide a Node-trusted CA chain.
    ssl: {
      rejectUnauthorized: false,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForAuth.authPool = pool;
}

export const auth = betterAuth({
  database: pool,
  secret: authSecret,
  baseURL: authUrl,
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    ipAddress: {
      // Trust this header only when Cloudflare fronts the Next.js origin.
      ipAddressHeaders: ["cf-connecting-ip"],
    },
    database: {
      generateId: "uuid",
    },
  },
});
