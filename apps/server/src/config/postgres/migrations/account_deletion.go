package migrations

// accountDeletionSchemaStatements contains only the short-lived coordination
// lock used while a native Better Auth account deletion is in progress. It is
// not an account status or a soft-deletion record.
var accountDeletionSchemaStatements = []string{
	`CREATE TABLE IF NOT EXISTS account_deletion_locks (
		user_id uuid NOT NULL PRIMARY KEY REFERENCES "user" ("id") ON DELETE CASCADE,
		created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`,
	`CREATE OR REPLACE FUNCTION fn_account_deletion_lock_acquire(p_user_id uuid)
	RETURNS boolean
	LANGUAGE plpgsql
	AS $$
	DECLARE
		v_user_id uuid;
	BEGIN
		INSERT INTO account_deletion_locks (user_id)
		VALUES (p_user_id)
		ON CONFLICT (user_id) DO UPDATE
		SET created_at = CURRENT_TIMESTAMP
		WHERE account_deletion_locks.created_at < CURRENT_TIMESTAMP - INTERVAL '15 minutes'
		RETURNING user_id INTO v_user_id;

		RETURN v_user_id IS NOT NULL;
	END;
	$$`,
	`CREATE OR REPLACE FUNCTION fn_account_deletion_lock_exists(p_user_id uuid)
	RETURNS boolean
	LANGUAGE sql
	STABLE
	AS $$
		SELECT EXISTS (
			SELECT 1
			FROM account_deletion_locks
			WHERE user_id = $1
				AND created_at >= CURRENT_TIMESTAMP - INTERVAL '15 minutes'
		);
	$$`,
	`CREATE OR REPLACE FUNCTION fn_account_deletion_lock_release(p_user_id uuid)
	RETURNS integer
	LANGUAGE plpgsql
	AS $$
	DECLARE
		v_deleted_count integer;
	BEGIN
		DELETE FROM account_deletion_locks
		WHERE user_id = p_user_id;

		GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
		RETURN v_deleted_count;
	END;
	$$`,
}
