create table email_deliveries (
	id uuid default pg_catalog.gen_random_uuid() not null primary key,
	user_id uuid references "user" ("id") on delete set null,
	email text not null,
	purpose text not null,
	provider text not null default 'resend',
	provider_message_id text,
	status text not null,
	quota_date date not null,
	idempotency_key text not null unique,
	accepted_at timestamptz,
	delivered_at timestamptz,
	error_code text,
	error_message text,
	created_at timestamptz not null default CURRENT_TIMESTAMP,
	updated_at timestamptz not null default CURRENT_TIMESTAMP,
	constraint email_deliveries_status_check
		check (status in ('reserved', 'accepted', 'delivered', 'bounced', 'failed', 'suppressed', 'request_failed', 'cancelled')),
	constraint email_deliveries_purpose_check
		check (purpose in ('email_verification', 'password_reset', 'account_deletion'))
);

create index email_deliveries_quota_date_idx on email_deliveries (quota_date);

create index email_deliveries_status_idx on email_deliveries (status);

create index email_deliveries_email_idx on email_deliveries (email);

create index email_deliveries_provider_message_id_idx
	on email_deliveries (provider_message_id)
	where provider_message_id is not null;

create index email_deliveries_purpose_idx on email_deliveries (purpose);

create index email_deliveries_created_at_idx on email_deliveries (created_at);
