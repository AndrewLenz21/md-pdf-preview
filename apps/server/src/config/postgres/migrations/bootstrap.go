package migrations

import (
	"context"
	"fmt"
	"regexp"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var schemaIdentifierPattern = regexp.MustCompile(`^[a-z_][a-z0-9_]*$`)

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

	for _, statement := range schemaStatements(schema) {
		if _, err := tx.Exec(ctx, statement); err != nil {
			return fmt.Errorf("apply database schema: %w", err)
		}
	}

	if err := configureRetentionCron(ctx, tx, schema); err != nil {
		return fmt.Errorf("configure PostgreSQL retention: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit database bootstrap transaction: %w", err)
	}

	return nil
}

func SchemaStatements() []string {
	return schemaStatements(retentionDefaultSchema)
}

func schemaStatements(schema string) []string {
	retentionStatements := retentionSchemaStatements(schema)
	statements := make([]string, 0, len(betterAuthSchemaStatements)+len(accountDeletionSchemaStatements)+len(workspaceItemsSchemaStatements)+len(loggerSchemaStatements)+len(emailDeliveriesSchemaStatements)+len(retentionStatements))
	statements = append(statements, betterAuthSchemaStatements...)
	statements = append(statements, accountDeletionSchemaStatements...)
	statements = append(statements, emailDeliveriesSchemaStatements...)
	statements = append(statements, workspaceItemsSchemaStatements...)
	statements = append(statements, loggerSchemaStatements...)
	statements = append(statements, retentionStatements...)
	return statements
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
