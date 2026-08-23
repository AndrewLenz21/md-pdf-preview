package migrations

import (
	"context"
	"fmt"

	"github.com/andrew/md-pdf-preview/server/src/config/logging"
	"github.com/jackc/pgx/v5"
)

const (
	retentionDefaultSchema = "app2"
	retentionCronJobName   = "md_pdf_preview_daily_retention_cleanup"
	retentionCronSchedule  = "30 3 * * *"
	retentionExtensionSave = "retention_pg_cron_extension"
	retentionScheduleSave  = "retention_pg_cron_schedule"
)

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

func configureRetentionCron(ctx context.Context, tx pgx.Tx, schema string) error {
	var available bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM pg_catalog.pg_available_extensions
			WHERE name = 'pg_cron'
		)`).Scan(&available); err != nil {
		return fmt.Errorf("check pg_cron availability: %w", err)
	}

	if !available {
		logging.Printf("⚠️ [postgres] pg_cron is unavailable; retention functions were created for schema %s, but daily scheduling was skipped", schema)
		return nil
	}

	// The job name is database-wide, so serialize scheduling even when two
	// configured application schemas are bootstrapped concurrently.
	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext($1))", retentionCronJobName); err != nil {
		return fmt.Errorf("lock pg_cron retention scheduling: %w", err)
	}

	if _, err := tx.Exec(ctx, "SAVEPOINT "+retentionExtensionSave); err != nil {
		return fmt.Errorf("save pg_cron extension setup: %w", err)
	}

	if _, err := tx.Exec(ctx, "CREATE EXTENSION IF NOT EXISTS pg_cron"); err != nil {
		if rollbackErr := rollbackSavepoint(ctx, tx, retentionExtensionSave); rollbackErr != nil {
			return rollbackErr
		}

		logging.Printf("⚠️ [postgres] pg_cron could not be enabled; retention functions were created for schema %s, but daily scheduling was skipped: %v", schema, err)
		return nil
	}

	if _, err := tx.Exec(ctx, "RELEASE SAVEPOINT "+retentionExtensionSave); err != nil {
		return fmt.Errorf("release pg_cron extension setup: %w", err)
	}

	return scheduleRetentionJob(ctx, tx, schema)
}

func scheduleRetentionJob(ctx context.Context, tx pgx.Tx, schema string) error {
	if _, err := tx.Exec(ctx, "SAVEPOINT "+retentionScheduleSave); err != nil {
		return fmt.Errorf("save pg_cron scheduling: %w", err)
	}

	warnAndRollback := func(cause error) error {
		if rollbackErr := rollbackSavepoint(ctx, tx, retentionScheduleSave); rollbackErr != nil {
			return rollbackErr
		}

		logging.Printf("⚠️ [postgres] pg_cron retention scheduling was skipped for schema %s; cleanup functions remain manually executable: %v", schema, cause)
		return nil
	}

	var cronJobTableExists bool
	if err := tx.QueryRow(ctx, `
		SELECT pg_catalog.to_regclass('cron.job') IS NOT NULL`).Scan(&cronJobTableExists); err != nil {
		return warnAndRollback(fmt.Errorf("check cron.job: %w", err))
	}
	if !cronJobTableExists {
		return warnAndRollback(fmt.Errorf("pg_cron is installed without cron.job in this database"))
	}

	jobIDs, err := retentionJobIDs(ctx, tx)
	if err != nil {
		return warnAndRollback(err)
	}

	for _, jobID := range jobIDs {
		var removed bool
		if err := tx.QueryRow(ctx, `SELECT cron.unschedule($1::bigint)`, jobID).Scan(&removed); err != nil {
			return warnAndRollback(fmt.Errorf("remove existing retention job %d: %w", jobID, err))
		}
		if !removed {
			return warnAndRollback(fmt.Errorf("pg_cron did not remove existing retention job %d", jobID))
		}
	}

	command := retentionCronCommand(schema)
	var jobID int64
	if err := tx.QueryRow(ctx, `
		SELECT cron.schedule($1::text, $2::text, $3::text)`, retentionCronJobName, retentionCronSchedule, command).Scan(&jobID); err != nil {
		return warnAndRollback(fmt.Errorf("create retention job: %w", err))
	}

	var matchingJobs int
	if err := tx.QueryRow(ctx, `
		SELECT COUNT(*)::integer
		FROM cron.job
		WHERE jobname = $1
			AND active
			AND schedule = $2
			AND command = $3`, retentionCronJobName, retentionCronSchedule, command).Scan(&matchingJobs); err != nil {
		return warnAndRollback(fmt.Errorf("verify retention job %d: %w", jobID, err))
	}
	if matchingJobs != 1 {
		return warnAndRollback(fmt.Errorf("expected exactly one active retention job, found %d", matchingJobs))
	}

	if _, err := tx.Exec(ctx, "RELEASE SAVEPOINT "+retentionScheduleSave); err != nil {
		return fmt.Errorf("release pg_cron scheduling: %w", err)
	}

	return nil
}

func retentionJobIDs(ctx context.Context, tx pgx.Tx) ([]int64, error) {
	rows, err := tx.Query(ctx, `
		SELECT jobid
		FROM cron.job
		WHERE jobname = $1
		ORDER BY jobid`, retentionCronJobName)
	if err != nil {
		return nil, fmt.Errorf("find existing retention jobs: %w", err)
	}
	defer rows.Close()

	jobIDs := make([]int64, 0)
	for rows.Next() {
		var jobID int64
		if err := rows.Scan(&jobID); err != nil {
			return nil, fmt.Errorf("read existing retention job: %w", err)
		}
		jobIDs = append(jobIDs, jobID)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read existing retention jobs: %w", err)
	}

	return jobIDs, nil
}

func retentionCronCommand(schema string) string {
	return fmt.Sprintf(
		"SELECT %s.fn_request_logs_cleanup(); SELECT %s.fn_email_deliveries_cleanup();",
		schema,
		schema,
	)
}

func rollbackSavepoint(ctx context.Context, tx pgx.Tx, savepoint string) error {
	if _, err := tx.Exec(ctx, "ROLLBACK TO SAVEPOINT "+savepoint); err != nil {
		return fmt.Errorf("rollback savepoint %s: %w", savepoint, err)
	}
	if _, err := tx.Exec(ctx, "RELEASE SAVEPOINT "+savepoint); err != nil {
		return fmt.Errorf("release savepoint %s: %w", savepoint, err)
	}
	return nil
}
