package request_logs

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/andrew/md-pdf-preview/server/src/config/postgres"
	"github.com/andrew/md-pdf-preview/server/src/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RequestLogRepository persists request metadata and the structured error document.
type RequestLogRepository struct {
	database *pgxpool.Pool
	schema   string
}

func NewRequestLogRepository(database *pgxpool.Pool, schema string) *RequestLogRepository {
	return &RequestLogRepository{
		database: database,
		schema:   schema,
	}
}

// Create stores the request metadata. logger_error remains NULL for normal requests.
func (r *RequestLogRepository) Create(ctx context.Context, requestLog models.RequestLog) error {
	requestID, err := parseUUID(requestLog.RequestID)
	if err != nil {
		return fmt.Errorf("create request log: invalid request ID: %w", err)
	}

	operationID, err := nullableUUID(requestLog.OperationID)
	if err != nil {
		return fmt.Errorf("create request log: invalid operation ID: %w", err)
	}

	userID, err := nullableUUID(requestLog.UserID)
	if err != nil {
		return fmt.Errorf("create request log: invalid user ID: %w", err)
	}

	var createdID pgtype.UUID
	if err := r.queryService().MutationCall(
		ctx,
		"fn_request_log_create",
		&createdID,
		requestID,
		operationID,
		userID,
		requestLog.Method,
		requestLog.Endpoint,
		jsonArgument(requestLog.Input),
		jsonArgument(requestLog.Output),
		int16(requestLog.Status),
		requestLog.Outcome,
		nullableIP(requestLog.IPAddress),
		requestLog.DurationMs,
		nullableString(requestLog.ErrorCode),
		nullableString(requestLog.ConsoleLogsR2Key),
		nullableInt64(requestLog.ConsoleLogsSizeBytes),
		nullableString(requestLog.ConsoleLogsSHA256),
	); err != nil {
		return fmt.Errorf("create request log: %w", err)
	}

	return nil
}

// UpdateLoggerError stores the complete structured error JSON after its R2 upload succeeds.
func (r *RequestLogRepository) UpdateLoggerError(
	ctx context.Context,
	requestID string,
	loggerError json.RawMessage,
) error {
	parsedRequestID, err := parseUUID(requestID)
	if err != nil {
		return fmt.Errorf("update request logger error: invalid request ID: %w", err)
	}

	var updated bool
	if err := r.queryService().MutationCall(
		ctx,
		"fn_request_log_update_error",
		&updated,
		parsedRequestID,
		jsonArgument(loggerError),
	); err != nil {
		return fmt.Errorf("update request logger error: %w", err)
	}
	if !updated {
		return fmt.Errorf("update request logger error: %w", pgx.ErrNoRows)
	}

	return nil
}

func (r *RequestLogRepository) queryService() *postgres.QueryService {
	return postgres.NewQueryService(r.schema, r.database)
}

func parseUUID(value string) (pgtype.UUID, error) {
	var result pgtype.UUID
	if err := result.Scan(value); err != nil {
		return pgtype.UUID{}, err
	}

	return result, nil
}

func nullableUUID(value *string) (pgtype.UUID, error) {
	if value == nil || *value == "" {
		return pgtype.UUID{}, nil
	}

	return parseUUID(*value)
}

func jsonArgument(value json.RawMessage) any {
	if len(value) == 0 {
		return nil
	}

	return value
}

func nullableString(value *string) any {
	if value == nil {
		return nil
	}

	return *value
}

func nullableInt64(value *int64) any {
	if value == nil {
		return nil
	}

	return *value
}

func nullableIP(value string) any {
	if value == "" {
		return nil
	}

	return value
}
