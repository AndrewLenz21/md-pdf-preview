package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func BootstrapSchema(ctx context.Context, pool *pgxpool.Pool, schema string) error {
	if !schemaIdentifierPattern.MatchString(schema) {
		return fmt.Errorf("schema must be a valid PostgreSQL schema identifier")
	}

	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin database bootstrap transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	// Prevent concurrent deployments from creating the same tables simultaneously.
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext($1))", schema); err != nil {
		return fmt.Errorf("lock database bootstrap: %w", err)
	}

	if _, err := tx.Exec(ctx, fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %s", schema)); err != nil {
		return fmt.Errorf("create schema %s: %w", schema, err)
	}

	if _, err := tx.Exec(ctx, fmt.Sprintf("SET LOCAL search_path TO %s", schema)); err != nil {
		return fmt.Errorf("set search path to %s: %w", schema, err)
	}

	for _, statement := range betterAuthSchemaStatements {
		if _, err := tx.Exec(ctx, statement); err != nil {
			return fmt.Errorf("apply Better Auth schema: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit database bootstrap transaction: %w", err)
	}

	return nil
}

// Generated from apps/server/database/better-auth-schema.sql for Better Auth 1.6.27.
var betterAuthSchemaStatements = []string{
	`CREATE TABLE IF NOT EXISTS "user" (
		"id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL PRIMARY KEY,
		"name" text NOT NULL,
		"email" text NOT NULL UNIQUE,
		"emailVerified" boolean NOT NULL,
		"image" text,
		"createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
		"updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS "session" (
		"id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL PRIMARY KEY,
		"expiresAt" timestamptz NOT NULL,
		"token" text NOT NULL UNIQUE,
		"createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
		"updatedAt" timestamptz NOT NULL,
		"ipAddress" text,
		"userAgent" text,
		"userId" uuid NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
	)`,
	`CREATE TABLE IF NOT EXISTS "account" (
		"id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL PRIMARY KEY,
		"accountId" text NOT NULL,
		"providerId" text NOT NULL,
		"userId" uuid NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
		"accessToken" text,
		"refreshToken" text,
		"idToken" text,
		"accessTokenExpiresAt" timestamptz,
		"refreshTokenExpiresAt" timestamptz,
		"scope" text,
		"password" text,
		"createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
		"updatedAt" timestamptz NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS "verification" (
		"id" uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL PRIMARY KEY,
		"identifier" text NOT NULL,
		"value" text NOT NULL,
		"expiresAt" timestamptz NOT NULL,
		"createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
		"updatedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
	)`,
	`CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId")`,
	`CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId")`,
	`CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier")`,
}
