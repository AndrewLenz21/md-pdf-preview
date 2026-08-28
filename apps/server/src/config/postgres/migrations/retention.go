package migrations

import "fmt"

const retentionDefaultSchema = "your_schema"

// retentionSchemaStatements contains only the cleanup functions. The functions
// qualify their tables so their behavior does not depend on a cron worker's
// search_path.
func retentionSchemaStatements(schema string) []string {
	return []string{
		fmt.Sprintf(`CREATE OR REPLACE FUNCTION %s.fn_request_logs_cleanup()
		RETURNS bigint
		LANGUAGE plpgsql
		SET search_path = pg_catalog
		AS $$
		DECLARE
			v_deleted_count bigint;
		BEGIN
			DELETE FROM %s.request_logs
			WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

			GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
			RETURN v_deleted_count;
		END;
		$$`, schema, schema),
		fmt.Sprintf(`CREATE OR REPLACE FUNCTION %s.fn_email_deliveries_cleanup()
		RETURNS bigint
		LANGUAGE plpgsql
		SET search_path = pg_catalog
		AS $$
		DECLARE
			v_deleted_count bigint;
		BEGIN
			DELETE FROM %s.email_deliveries
			WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

			GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
			RETURN v_deleted_count;
		END;
		$$`, schema, schema),
	}
}
