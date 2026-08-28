package tests

import (
	"strings"
	"testing"

	"github.com/andrew/md-pdf-preview/server/src/config/postgres"
	"github.com/andrew/md-pdf-preview/server/src/config/postgres/migrations"
)

func TestWorkspaceItemsSchemaProtectsTreeInvariants(t *testing.T) {
	schema := strings.Join(migrations.SchemaStatements(), "\n")

	requiredFragments := []string{
		"CREATE TABLE IF NOT EXISTS account_deletion_locks",
		"REFERENCES \"user\" (\"id\") ON DELETE CASCADE",
		"fn_account_deletion_lock_acquire",
		"fn_account_deletion_lock_exists",
		"created_at >= CURRENT_TIMESTAMP - INTERVAL '15 minutes'",
		"fn_account_deletion_lock_release",
		"CREATE TABLE IF NOT EXISTS workspace_items",
		"id uuid DEFAULT pg_catalog.gen_random_uuid()",
		"user_id uuid NOT NULL REFERENCES \"user\" (\"id\")",
		"FOREIGN KEY (user_id, parent_id)",
		"CHECK (item_type IN ('folder', 'document'))",
		"CHECK (char_length(btrim(name)) > 0)",
		"fn_workspace_item_create",
		"fn_workspace_item_update",
		"fn_workspace_document_upload_complete",
		"fn_workspace_item_collect_r2_keys",
		"fn_workspace_items_collect_user_r2_keys",
		"fn_workspace_item_delete",
		"CREATE TRIGGER workspace_items_updated_at_trigger",
	}

	for _, fragment := range requiredFragments {
		if !strings.Contains(schema, fragment) {
			t.Errorf("workspace schema is missing %q", fragment)
		}
	}
}

func TestWorkspaceDeleteRemovesRowsPhysically(t *testing.T) {
	schema := strings.Join(migrations.SchemaStatements(), "\n")

	if !strings.Contains(schema, "DELETE FROM workspace_items item") {
		t.Fatal("workspace item deletion must physically delete rows")
	}
	if strings.Contains(schema, "SET deleted_at = CURRENT_TIMESTAMP") {
		t.Fatal("workspace item deletion must not soft delete rows")
	}
}

func TestWorkspaceItemsSchemaAllowsRootDuplicates(t *testing.T) {
	schema := strings.Join(migrations.SchemaStatements(), "\n")

	if !strings.Contains(schema, "parent_id uuid") {
		t.Fatal("workspace items must allow nullable parent_id for root items")
	}

	if strings.Contains(schema, "UNIQUE (user_id, parent_id, name)") {
		t.Fatal("workspace item names must not be unique within a parent")
	}
}

func TestRequestLogsSchemaStoresRequestMetadataAndR2Details(t *testing.T) {
	schema := strings.Join(migrations.SchemaStatements(), "\n")

	requiredFragments := []string{
		"CREATE TABLE IF NOT EXISTS request_logs",
		"request_id uuid NOT NULL PRIMARY KEY",
		"user_id uuid REFERENCES \"user\" (\"id\") ON DELETE SET NULL",
		"endpoint text NOT NULL",
		"input jsonb",
		"output jsonb",
		"ip_address inet",
		"logger_error jsonb",
		"console_logs_r2_key text",
		"fn_request_log_create",
		"fn_request_log_update_error",
		"ON CONFLICT (request_id) DO NOTHING",
	}

	for _, fragment := range requiredFragments {
		if !strings.Contains(schema, fragment) {
			t.Errorf("request logs schema is missing %q", fragment)
		}
	}
}

func TestEmailDeliveriesAllowsSupportedPurposes(t *testing.T) {
	schema := strings.Join(migrations.SchemaStatements(), "\n")

	for _, fragment := range []string{
		"email_verification', 'password_reset', 'account_deletion",
	} {
		if !strings.Contains(schema, fragment) {
			t.Errorf("email deliveries schema is missing %q", fragment)
		}
	}
}

func TestBootstrapSchemaAvoidsTriggerReplacement(t *testing.T) {
	schema := strings.Join(migrations.SchemaStatements(), "\n")

	if strings.Contains(schema, "DROP TRIGGER") {
		t.Fatal("bootstrap schema must not replace triggers")
	}
}

func TestBuildFunctionQueryUsesGenericFunctionArguments(t *testing.T) {
	query := postgres.BuildFunctionQuery("app2", "fn_workspace_items_list", "user-id", nil, true)
	want := "SELECT * FROM app2.fn_workspace_items_list($1,$2,$3)"

	if query != want {
		t.Fatalf("BuildFunctionQuery() = %q, want %q", query, want)
	}
}
