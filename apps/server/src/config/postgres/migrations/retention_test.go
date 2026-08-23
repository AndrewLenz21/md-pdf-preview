package migrations

import (
	"context"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestRetentionFunctionsUseConfiguredSchema(t *testing.T) {
	statements := strings.Join(retentionSchemaStatements("tenant_data"), "\n")

	requiredFragments := []string{
		"CREATE OR REPLACE FUNCTION tenant_data.fn_request_logs_cleanup()",
		"DELETE FROM tenant_data.request_logs",
		"CREATE OR REPLACE FUNCTION tenant_data.fn_email_deliveries_cleanup()",
		"DELETE FROM tenant_data.email_deliveries",
		"CURRENT_TIMESTAMP - INTERVAL '30 days'",
		"GET DIAGNOSTICS v_deleted_count = ROW_COUNT",
		"SET search_path = pg_catalog",
	}
	for _, fragment := range requiredFragments {
		if !strings.Contains(statements, fragment) {
			t.Errorf("retention schema is missing %q", fragment)
		}
	}

	if strings.Contains(statements, "DELETE FROM request_logs") || strings.Contains(statements, "DELETE FROM email_deliveries") {
		t.Fatal("retention functions must qualify their table references")
	}
}

func TestRetentionCronCommandUsesConfiguredSchema(t *testing.T) {
	command := retentionCronCommand("tenant_data")
	want := "SELECT tenant_data.fn_request_logs_cleanup(); SELECT tenant_data.fn_email_deliveries_cleanup();"

	if command != want {
		t.Fatalf("retentionCronCommand() = %q, want %q", command, want)
	}
	if retentionCronJobName != "md_pdf_preview_daily_retention_cleanup" {
		t.Fatalf("retention job name changed unexpectedly: %q", retentionCronJobName)
	}
	if retentionCronSchedule != "30 3 * * *" {
		t.Fatalf("retention cron schedule changed unexpectedly: %q", retentionCronSchedule)
	}
}

func TestOperationalRetentionTablesHaveCreatedAtIndexes(t *testing.T) {
	if !strings.Contains(strings.Join(loggerSchemaStatements, "\n"), "request_logs_created_at_idx") {
		t.Fatal("request_logs must have a created_at index")
	}
	if !strings.Contains(strings.Join(emailDeliveriesSchemaStatements, "\n"), "email_deliveries_created_at_idx") {
		t.Fatal("email_deliveries must have a created_at index")
	}
}

func TestRetentionFunctionsDeleteOnlyExpiredOperationalRecords(t *testing.T) {
	databaseURL := strings.TrimSpace(os.Getenv("POSTGRES_TEST_DATABASE_URL"))
	if databaseURL == "" {
		t.Skip("set POSTGRES_TEST_DATABASE_URL to run PostgreSQL retention integration tests")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("open PostgreSQL test pool: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("ping PostgreSQL test database: %v", err)
	}

	schema := fmt.Sprintf("retention_test_%d", time.Now().UnixNano())
	if _, err := pool.Exec(ctx, fmt.Sprintf("CREATE SCHEMA %s", schema)); err != nil {
		t.Fatalf("create test schema: %v", err)
	}
	defer func() {
		if _, err := pool.Exec(context.Background(), fmt.Sprintf("DROP SCHEMA %s CASCADE", schema)); err != nil {
			t.Errorf("drop test schema: %v", err)
		}
	}()

	for _, statement := range []string{
		fmt.Sprintf(`CREATE TABLE %s."user" (id uuid PRIMARY KEY)`, schema),
		fmt.Sprintf(`CREATE TABLE %s."session" (id uuid PRIMARY KEY)`, schema),
		fmt.Sprintf(`CREATE TABLE %s."account" (id uuid PRIMARY KEY)`, schema),
		fmt.Sprintf(`CREATE TABLE %s.workspace_items (id uuid PRIMARY KEY)`, schema),
		fmt.Sprintf(`CREATE TABLE %s.request_logs (
			request_id uuid PRIMARY KEY,
			created_at timestamptz NOT NULL
		)`, schema),
		fmt.Sprintf(`CREATE TABLE %s.email_deliveries (
			id uuid PRIMARY KEY,
			created_at timestamptz NOT NULL
		)`, schema),
	} {
		if _, err := pool.Exec(ctx, statement); err != nil {
			t.Fatalf("create retention test table: %v", err)
		}
	}

	// Reapplying the function migration must not fail or create duplicate objects.
	for range 2 {
		for _, statement := range retentionSchemaStatements(schema) {
			if _, err := pool.Exec(ctx, statement); err != nil {
				t.Fatalf("apply retention function migration: %v", err)
			}
		}
	}

	old := time.Now().UTC().Add(-31 * 24 * time.Hour)
	newer := time.Now().UTC().Add(-29 * 24 * time.Hour)
	if _, err := pool.Exec(ctx, fmt.Sprintf(`
		INSERT INTO %s.request_logs (request_id, created_at)
		VALUES ($1, $2), ($3, $4)`, schema), retentionTestUUID(1), old, retentionTestUUID(2), newer); err != nil {
		t.Fatalf("insert request log fixtures: %v", err)
	}
	if _, err := pool.Exec(ctx, fmt.Sprintf(`
		INSERT INTO %s.email_deliveries (id, created_at)
		VALUES ($1, $2), ($3, $4)`, schema), retentionTestUUID(3), old, retentionTestUUID(4), newer); err != nil {
		t.Fatalf("insert email delivery fixtures: %v", err)
	}

	protectedTables := []string{"user", "session", "account", "workspace_items"}
	for index, table := range protectedTables {
		if _, err := pool.Exec(ctx, fmt.Sprintf("INSERT INTO %s.%q (id) VALUES ($1)", schema, table), retentionTestUUID(index+10)); err != nil {
			t.Fatalf("insert protected fixture into %s: %v", table, err)
		}
	}

	assertDeletedCount(t, ctx, pool, fmt.Sprintf("%s.fn_request_logs_cleanup()", schema), 1)
	assertDeletedCount(t, ctx, pool, fmt.Sprintf("%s.fn_email_deliveries_cleanup()", schema), 1)
	assertDeletedCount(t, ctx, pool, fmt.Sprintf("%s.fn_request_logs_cleanup()", schema), 0)
	assertDeletedCount(t, ctx, pool, fmt.Sprintf("%s.fn_email_deliveries_cleanup()", schema), 0)

	assertTableCount(t, ctx, pool, fmt.Sprintf("%s.request_logs", schema), 1)
	assertTableCount(t, ctx, pool, fmt.Sprintf("%s.email_deliveries", schema), 1)
	for _, table := range protectedTables {
		assertTableCount(t, ctx, pool, fmt.Sprintf("%s.%s", schema, table), 1)
	}
}

func assertDeletedCount(t *testing.T, ctx context.Context, pool *pgxpool.Pool, function string, want int64) {
	t.Helper()

	var got int64
	if err := pool.QueryRow(ctx, "SELECT "+function).Scan(&got); err != nil {
		t.Fatalf("call %s: %v", function, err)
	}
	if got != want {
		t.Fatalf("%s deleted %d rows, want %d", function, got, want)
	}
}

func assertTableCount(t *testing.T, ctx context.Context, pool *pgxpool.Pool, table string, want int64) {
	t.Helper()

	var got int64
	if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM "+table).Scan(&got); err != nil {
		t.Fatalf("count %s: %v", table, err)
	}
	if got != want {
		t.Fatalf("%s contains %d rows, want %d", table, got, want)
	}
}

func retentionTestUUID(value int) string {
	return fmt.Sprintf("00000000-0000-0000-0000-%012d", value)
}
