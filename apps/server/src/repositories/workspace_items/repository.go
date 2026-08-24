package workspace_items

import (
	"context"
	"fmt"

	"github.com/andrew/md-pdf-preview/server/src/config/postgres"
	"github.com/andrew/md-pdf-preview/server/src/models"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

// 📁 WorkspaceItemRepository persists the user's workspace tree.
type WorkspaceItemRepository struct {
	database *pgxpool.Pool
	schema   string
}

// 🏗️ NewWorkspaceItemRepository creates a repository backed by PostgreSQL.
func NewWorkspaceItemRepository(database *pgxpool.Pool, schema string) *WorkspaceItemRepository {
	return &WorkspaceItemRepository{
		database: database,
		schema:   schema,
	}
}

// ➕ Create inserts a folder or document and returns the generated item.
func (r *WorkspaceItemRepository) Create(
	ctx context.Context,
	userID string,
	params models.CreateWorkspaceItemParams,
) (models.WorkspaceItem, error) {
	userUUID, err := parseUUID(userID)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("create workspace item: invalid user ID: %w", err)
	}

	parentUUID, err := nullableUUIDArgument(params.ParentID)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("create workspace item: invalid parent ID: %w", err)
	}

	item, err := r.selectOne(
		ctx,
		"fn_workspace_item_create",
		userUUID,
		parentUUID,
		textArgument(params.Name),
		textArgument(params.Type),
		nullableText(params.Color),
		nullableText(params.Icon),
	)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("create workspace item: %w", err)
	}

	return item, nil
}

// 📚 List retrieves the active workspace items owned by the user.
func (r *WorkspaceItemRepository) List(
	ctx context.Context,
	userID string,
) ([]models.WorkspaceItem, error) {
	userUUID, err := parseUUID(userID)
	if err != nil {
		return nil, fmt.Errorf("list workspace items: invalid user ID: %w", err)
	}

	rows, err := r.queryService().SelectCall(ctx, "fn_workspace_items_list", userUUID)
	if err != nil {
		return nil, fmt.Errorf("list workspace items: %w", err)
	}
	defer rows.Close()

	items := make([]models.WorkspaceItem, 0)
	for rows.Next() {
		item, scanErr := mapWorkspaceItem(rows)
		if scanErr != nil {
			return nil, fmt.Errorf("scan workspace item: %w", scanErr)
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate workspace items: %w", err)
	}

	return items, nil
}

// 🔍 Get retrieves one active workspace item owned by the user.
func (r *WorkspaceItemRepository) Get(
	ctx context.Context,
	userID string,
	itemID string,
) (models.WorkspaceItem, error) {
	userUUID, err := parseUUID(userID)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("get workspace item: invalid user ID: %w", err)
	}

	itemUUID, err := parseUUID(itemID)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("get workspace item: invalid item ID: %w", err)
	}

	item, err := r.selectOne(ctx, "fn_workspace_item_get", userUUID, itemUUID)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("get workspace item: %w", err)
	}

	return item, nil
}

// ✏️ Update handles metadata changes and moving an item in the tree.
// A nil ParentID moves the item to the logical workspace root.
func (r *WorkspaceItemRepository) Update(
	ctx context.Context,
	userID string,
	params models.UpdateWorkspaceItemParams,
) (models.WorkspaceItem, error) {
	userUUID, err := parseUUID(userID)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("update workspace item: invalid user ID: %w", err)
	}

	itemUUID, err := parseUUID(params.ItemID)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("update workspace item: invalid item ID: %w", err)
	}

	parentUUID, err := nullableUUIDArgument(params.ParentID)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("update workspace item: invalid parent ID: %w", err)
	}

	item, err := r.selectOne(
		ctx,
		"fn_workspace_item_update",
		userUUID,
		itemUUID,
		textArgument(params.Name),
		parentUUID,
		nullableText(params.Color),
		nullableText(params.Icon),
		params.Favorite,
		int32(params.SortOrder),
	)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("update workspace item: %w", err)
	}

	return item, nil
}

// CompleteDocumentUpload persists the metadata for an uploaded document.
func (r *WorkspaceItemRepository) CompleteDocumentUpload(
	ctx context.Context,
	userID string,
	params models.CompleteDocumentUploadParams,
) (models.WorkspaceItem, error) {
	userUUID, err := parseUUID(userID)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("complete document upload: invalid user ID: %w", err)
	}

	documentUUID, err := parseUUID(params.DocumentID)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("complete document upload: invalid document ID: %w", err)
	}

	item, err := r.selectOne(
		ctx,
		"fn_workspace_document_upload_complete",
		userUUID,
		documentUUID,
		textArgument(params.R2ObjectKey),
		textArgument(params.ContentType),
		params.SizeBytes,
		textArgument(params.ContentHash),
		params.ContentRevision,
	)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("complete document upload: %w", err)
	}

	return item, nil
}

// CollectSubtreeR2ObjectKeys returns the R2 keys owned by the user in an item subtree.
func (r *WorkspaceItemRepository) CollectSubtreeR2ObjectKeys(
	ctx context.Context,
	userID string,
	itemID string,
) ([]string, error) {
	userUUID, err := parseUUID(userID)
	if err != nil {
		return nil, fmt.Errorf("collect workspace item objects: invalid user ID: %w", err)
	}

	itemUUID, err := parseUUID(itemID)
	if err != nil {
		return nil, fmt.Errorf("collect workspace item objects: invalid item ID: %w", err)
	}

	rows, err := r.queryService().SelectCall(ctx, "fn_workspace_item_collect_r2_keys", userUUID, itemUUID)
	if err != nil {
		return nil, fmt.Errorf("collect workspace item objects: %w", err)
	}
	defer rows.Close()

	objectKeys := make([]string, 0)
	for rows.Next() {
		var objectKey string
		if err := rows.Scan(&objectKey); err != nil {
			return nil, fmt.Errorf("scan workspace item object key: %w", err)
		}
		objectKeys = append(objectKeys, objectKey)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate workspace item object keys: %w", err)
	}

	return objectKeys, nil
}

// CollectR2ObjectKeys returns every persisted R2 key owned by the user.
func (r *WorkspaceItemRepository) CollectR2ObjectKeys(
	ctx context.Context,
	userID string,
) ([]string, error) {
	userUUID, err := parseUUID(userID)
	if err != nil {
		return nil, fmt.Errorf("collect user workspace objects: invalid user ID: %w", err)
	}

	rows, err := r.queryService().SelectCall(ctx, "fn_workspace_items_collect_user_r2_keys", userUUID)
	if err != nil {
		return nil, fmt.Errorf("collect user workspace objects: %w", err)
	}
	defer rows.Close()

	objectKeys := make([]string, 0)
	for rows.Next() {
		var objectKey string
		if err := rows.Scan(&objectKey); err != nil {
			return nil, fmt.Errorf("scan user workspace object key: %w", err)
		}
		objectKeys = append(objectKeys, objectKey)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate user workspace object keys: %w", err)
	}

	return objectKeys, nil
}

// AcquireDeletionLock prevents workspace operations from racing account
// cleanup. The lock is removed when cleanup fails and cascades with the user
// row after Better Auth completes deletion.
func (r *WorkspaceItemRepository) AcquireDeletionLock(
	ctx context.Context,
	userID string,
) (bool, error) {
	userUUID, err := parseUUID(userID)
	if err != nil {
		return false, fmt.Errorf("acquire account deletion lock: invalid user ID: %w", err)
	}

	var acquired bool
	if err := r.queryService().MutationCall(
		ctx,
		"fn_account_deletion_lock_acquire",
		&acquired,
		userUUID,
	); err != nil {
		return false, fmt.Errorf("acquire account deletion lock: %w", err)
	}

	return acquired, nil
}

func (r *WorkspaceItemRepository) ReleaseDeletionLock(
	ctx context.Context,
	userID string,
) error {
	userUUID, err := parseUUID(userID)
	if err != nil {
		return fmt.Errorf("release account deletion lock: invalid user ID: %w", err)
	}

	var deletedCount int
	if err := r.queryService().MutationCall(
		ctx,
		"fn_account_deletion_lock_release",
		&deletedCount,
		userUUID,
	); err != nil {
		return fmt.Errorf("release account deletion lock: %w", err)
	}

	return nil
}

func (r *WorkspaceItemRepository) IsDeletionLocked(
	ctx context.Context,
	userID string,
) (bool, error) {
	userUUID, err := parseUUID(userID)
	if err != nil {
		return false, fmt.Errorf("check account deletion lock: invalid user ID: %w", err)
	}

	var locked bool
	query := postgres.BuildFunctionQuery(r.schema, "fn_account_deletion_lock_exists", userUUID)
	if err := r.database.QueryRow(ctx, query, userUUID).Scan(&locked); err != nil {
		return false, fmt.Errorf("check account deletion lock: %w", err)
	}

	return locked, nil
}

// Delete physically deletes an item and its descendants.
func (r *WorkspaceItemRepository) Delete(
	ctx context.Context,
	userID string,
	itemID string,
) (int, error) {
	userUUID, err := parseUUID(userID)
	if err != nil {
		return 0, fmt.Errorf("delete workspace item: invalid user ID: %w", err)
	}

	itemUUID, err := parseUUID(itemID)
	if err != nil {
		return 0, fmt.Errorf("delete workspace item: invalid item ID: %w", err)
	}

	var deletedCount int
	if err := r.queryService().MutationCall(
		ctx,
		"fn_workspace_item_delete",
		&deletedCount,
		userUUID,
		itemUUID,
	); err != nil {
		return 0, fmt.Errorf("delete workspace item: %w", err)
	}

	return deletedCount, nil
}

// 🧩 queryService creates the shared PostgreSQL function caller.
func (r *WorkspaceItemRepository) queryService() *postgres.QueryService {
	return postgres.NewQueryService(r.schema, r.database)
}

// 🎯 selectOne maps the first row returned by a PostgreSQL function.
func (r *WorkspaceItemRepository) selectOne(
	ctx context.Context,
	function string,
	args ...any,
) (models.WorkspaceItem, error) {
	rows, err := r.queryService().SelectCall(ctx, function, args...)
	if err != nil {
		return models.WorkspaceItem{}, err
	}
	defer rows.Close()

	if !rows.Next() {
		if err := rows.Err(); err != nil {
			return models.WorkspaceItem{}, err
		}

		return models.WorkspaceItem{}, pgx.ErrNoRows
	}

	return mapWorkspaceItem(rows)
}

// 🔐 parseUUID keeps UUID validation at the repository boundary.
func parseUUID(value string) (pgtype.UUID, error) {
	var result pgtype.UUID
	if err := result.Scan(value); err != nil {
		return pgtype.UUID{}, err
	}

	return result, nil
}

func nullableUUIDArgument(value *string) (pgtype.UUID, error) {
	if value == nil {
		return pgtype.UUID{}, nil
	}

	return parseUUID(*value)
}

func textArgument(value string) pgtype.Text {
	return pgtype.Text{String: value, Valid: true}
}

func nullableText(value *string) pgtype.Text {
	if value == nil {
		return pgtype.Text{}
	}

	return textArgument(*value)
}
