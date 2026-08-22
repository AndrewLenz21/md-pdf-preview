package workspace_items

import (
	"database/sql"
	"time"

	"github.com/andrew/md-pdf-preview/server/src/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type rowScanner interface {
	Scan(dest ...any) error
}

func mapWorkspaceItem(scanner rowScanner) (models.WorkspaceItem, error) {
	var (
		item         models.WorkspaceItem
		id           pgtype.UUID
		userID       pgtype.UUID
		parentID     pgtype.UUID
		color        sql.NullString
		icon         sql.NullString
		r2ObjectKey  sql.NullString
		contentType  sql.NullString
		sizeBytes    sql.NullInt64
		contentHash  sql.NullString
		storageState sql.NullString
		deletedAt    sql.NullTime
	)

	if err := scanner.Scan(
		&id,
		&userID,
		&parentID,
		&item.Type,
		&item.Name,
		&color,
		&icon,
		&item.Favorite,
		&item.SortOrder,
		&r2ObjectKey,
		&contentType,
		&sizeBytes,
		&contentHash,
		&item.ContentRevision,
		&storageState,
		&item.CreatedAt,
		&item.UpdatedAt,
		&deletedAt,
	); err != nil {
		return models.WorkspaceItem{}, err
	}

	item.ID = id.String()
	item.UserID = userID.String()
	item.ParentID = nullableUUID(parentID)
	item.Color = nullableString(color)
	item.Icon = nullableString(icon)
	item.R2ObjectKey = nullableString(r2ObjectKey)
	item.ContentType = nullableString(contentType)
	item.SizeBytes = nullableInt64(sizeBytes)
	item.ContentHash = nullableString(contentHash)
	item.StorageStatus = nullableString(storageState)
	item.DeletedAt = nullableTime(deletedAt)

	return item, nil
}

func nullableUUID(value pgtype.UUID) *string {
	if !value.Valid {
		return nil
	}

	result := value.String()
	return &result
}

func nullableString(value sql.NullString) *string {
	if !value.Valid {
		return nil
	}

	return &value.String
}

func nullableInt64(value sql.NullInt64) *int64 {
	if !value.Valid {
		return nil
	}

	return &value.Int64
}

func nullableTime(value sql.NullTime) *time.Time {
	if !value.Valid {
		return nil
	}

	return &value.Time
}

var _ rowScanner = pgx.Rows(nil)
