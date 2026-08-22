package postgres

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// QueryService centralizes calls to PostgreSQL functions for repositories.
// The schema is supplied by the validated DB_SCHEMA configuration.
type QueryService struct {
	pool   *pgxpool.Pool
	schema string
}

func NewQueryService(schema string, pool *pgxpool.Pool) *QueryService {
	return &QueryService{
		pool:   pool,
		schema: schema,
	}
}

// SelectCall executes a PostgreSQL function that returns rows.
func (service *QueryService) SelectCall(
	ctx context.Context,
	function string,
	args ...any,
) (pgx.Rows, error) {
	query := service.functionQuery(function, args...)
	rows, err := service.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("select PostgreSQL function %s: %w", function, err)
	}

	return rows, nil
}

// InsertCall executes a PostgreSQL function that returns a string value.
func (service *QueryService) InsertCall(
	ctx context.Context,
	function string,
	args ...any,
) (string, error) {
	var result string
	if err := service.MutationCall(ctx, function, &result, args...); err != nil {
		return "", err
	}

	return result, nil
}

// UpdateCall executes a PostgreSQL function that returns a string value.
func (service *QueryService) UpdateCall(
	ctx context.Context,
	function string,
	args ...any,
) (string, error) {
	var result string
	if err := service.MutationCall(ctx, function, &result, args...); err != nil {
		return "", err
	}

	return result, nil
}

// MutationCall executes a PostgreSQL function returning one scalar value in a transaction.
func (service *QueryService) MutationCall(
	ctx context.Context,
	function string,
	destination any,
	args ...any,
) error {
	tx, err := service.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin PostgreSQL function %s transaction: %w", function, err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	query := service.functionQuery(function, args...)
	if err := tx.QueryRow(ctx, query, args...).Scan(destination); err != nil {
		return fmt.Errorf("execute PostgreSQL function %s: %w", function, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit PostgreSQL function %s transaction: %w", function, err)
	}

	return nil
}

func (service *QueryService) functionQuery(function string, args ...any) string {
	return BuildFunctionQuery(service.schema, function, args...)
}

func BuildFunctionQuery(schema string, function string, args ...any) string {
	return fmt.Sprintf("SELECT * FROM %s.%s(%s)", schema, function, constructArgs(args...))
}

func constructArgs(args ...any) string {
	placeholders := make([]string, len(args))
	for index := range args {
		placeholders[index] = fmt.Sprintf("$%d", index+1)
	}

	return strings.Join(placeholders, ",")
}
