package migrations

/*
CREATE TABLE request_logs (
    request_id uuid,
    operation_id uuid,
    user_id uuid,
    method varchar(10),
    endpoint text,
    input jsonb,
    output jsonb,
    status smallint,
    outcome text,
    ip_address inet,
    duration_ms bigint,
    error_code text,
    logger_error jsonb,
    console_logs_r2_key text,
    console_logs_size_bytes bigint,
    console_logs_sha256 text,
    created_at timestamptz
);
*/

var loggerSchemaStatements = []string{
	`CREATE TABLE IF NOT EXISTS request_logs (
		request_id uuid NOT NULL PRIMARY KEY,
		operation_id uuid,
		user_id uuid REFERENCES "user" ("id") ON DELETE SET NULL,
		method varchar(10) NOT NULL,
		endpoint text NOT NULL,
		input jsonb,
		output jsonb,
		status smallint NOT NULL,
		outcome text NOT NULL,
		ip_address inet,
		duration_ms bigint NOT NULL,
		error_code text,
		logger_error jsonb,
		console_logs_r2_key text,
		console_logs_size_bytes bigint,
		console_logs_sha256 text,
		created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
		CONSTRAINT request_logs_status_check
			CHECK (status BETWEEN 100 AND 599),
		CONSTRAINT request_logs_outcome_check
			CHECK (outcome IN ('success', 'error')),
		CONSTRAINT request_logs_duration_check
			CHECK (duration_ms >= 0),
		CONSTRAINT request_logs_console_logs_size_check
			CHECK (
				console_logs_size_bytes IS NULL
				OR console_logs_size_bytes >= 0
			)
		)`,
	`CREATE INDEX IF NOT EXISTS request_logs_created_at_idx
		ON request_logs (created_at DESC)`,
	`CREATE INDEX IF NOT EXISTS request_logs_user_created_idx
		ON request_logs (user_id, created_at DESC)
		WHERE user_id IS NOT NULL`,
	`CREATE INDEX IF NOT EXISTS request_logs_operation_idx
		ON request_logs (operation_id)
		WHERE operation_id IS NOT NULL`,
	`CREATE OR REPLACE FUNCTION fn_request_log_create(
		p_request_id uuid,
		p_operation_id uuid,
		p_user_id uuid,
		p_method text,
		p_endpoint text,
		p_input jsonb,
		p_output jsonb,
		p_status smallint,
		p_outcome text,
		p_ip_address inet,
		p_duration_ms bigint,
		p_error_code text,
		p_console_logs_r2_key text,
		p_console_logs_size_bytes bigint,
		p_console_logs_sha256 text
	)
	RETURNS uuid
	LANGUAGE plpgsql
	AS $$
	BEGIN
		INSERT INTO request_logs (
			request_id,
			operation_id,
			user_id,
			method,
			endpoint,
			input,
			output,
			status,
			outcome,
			ip_address,
			duration_ms,
			error_code,
			console_logs_r2_key,
			console_logs_size_bytes,
			console_logs_sha256
		)
		VALUES (
			p_request_id,
			p_operation_id,
			p_user_id,
			p_method,
			p_endpoint,
			p_input,
			p_output,
			p_status,
			p_outcome,
			p_ip_address,
			p_duration_ms,
			p_error_code,
			p_console_logs_r2_key,
			p_console_logs_size_bytes,
			p_console_logs_sha256
		)
		ON CONFLICT (request_id) DO NOTHING;

		RETURN p_request_id;
	END;
	$$`,
	`CREATE OR REPLACE FUNCTION fn_request_log_update_error(
		p_request_id uuid,
		p_logger_error jsonb
	)
	RETURNS boolean
	LANGUAGE plpgsql
	AS $$
	BEGIN
		UPDATE request_logs
		SET logger_error = p_logger_error
		WHERE request_id = p_request_id;

		RETURN FOUND;
	END;
	$$`,
}
