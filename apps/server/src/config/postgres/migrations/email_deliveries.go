package migrations

// Generated from apps/server/database/email-deliveries-schema.sql
var emailDeliveriesSchemaStatements = []string{
	`CREATE TABLE IF NOT EXISTS email_deliveries (
		id uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL PRIMARY KEY,
		user_id uuid REFERENCES "user" ("id") ON DELETE SET NULL,
		email text NOT NULL,
		purpose text NOT NULL,
		provider text NOT NULL DEFAULT 'resend',
		provider_message_id text,
		status text NOT NULL,
		quota_date date NOT NULL,
		idempotency_key text NOT NULL UNIQUE,
		accepted_at timestamptz,
		delivered_at timestamptz,
		error_code text,
		error_message text,
		created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
		CONSTRAINT email_deliveries_status_check
			CHECK (status IN ('reserved', 'accepted', 'delivered', 'bounced', 'failed', 'suppressed', 'request_failed', 'cancelled')),
		CONSTRAINT email_deliveries_purpose_check
			CHECK (purpose IN ('email_verification', 'account_deletion'))
	)`,
	`CREATE INDEX IF NOT EXISTS email_deliveries_quota_date_idx ON email_deliveries (quota_date)`,
	`CREATE INDEX IF NOT EXISTS email_deliveries_status_idx ON email_deliveries (status)`,
	`CREATE INDEX IF NOT EXISTS email_deliveries_email_idx ON email_deliveries (email)`,
	`CREATE INDEX IF NOT EXISTS email_deliveries_provider_message_id_idx
		ON email_deliveries (provider_message_id)
		WHERE provider_message_id IS NOT NULL`,
	`CREATE INDEX IF NOT EXISTS email_deliveries_purpose_idx ON email_deliveries (purpose)`,
	`CREATE INDEX IF NOT EXISTS email_deliveries_created_at_idx ON email_deliveries (created_at)`,
}
