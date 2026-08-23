package workspace_service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/andrew/md-pdf-preview/server/src/config/postgres"
	"github.com/andrew/md-pdf-preview/server/src/models"
	workspace_repository "github.com/andrew/md-pdf-preview/server/src/repositories/workspace_items"
	cloudflare_service "github.com/andrew/md-pdf-preview/server/src/services/cloudflare"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrWorkspaceDatabaseUnavailable = errors.New("workspace PostgreSQL repository is not initialized")
var ErrWorkspaceItemNotDocument = errors.New("workspace item is not a document")
var ErrWorkspaceDocumentObjectKeyInvalid = errors.New("workspace document object key is invalid")

type workspaceRepository interface {
	Create(context.Context, string, models.CreateWorkspaceItemParams) (models.WorkspaceItem, error)
	List(context.Context, string) ([]models.WorkspaceItem, error)
	Get(context.Context, string, string) (models.WorkspaceItem, error)
	Update(context.Context, string, models.UpdateWorkspaceItemParams) (models.WorkspaceItem, error)
	CompleteDocumentUpload(context.Context, string, models.CompleteDocumentUploadParams) (models.WorkspaceItem, error)
	CollectSubtreeR2ObjectKeys(context.Context, string, string) ([]string, error)
	Delete(context.Context, string, string) (int, error)
}

type workspaceCloudStorage interface {
	GenerateDocumentUploadURL(context.Context, string, string, string) (cloudflare_service.PresignedDocumentURL, error)
	GenerateDocumentDownloadURL(context.Context, string, string) (cloudflare_service.PresignedDocumentURL, error)
	DeleteObjects(context.Context, []string) error
}

type Service struct {
	ctx   context.Context
	repo  workspaceRepository
	cloud workspaceCloudStorage
}

// 🏗️ New creates a workspace service from the initialized application resources.
func New(ctx context.Context) *Service {
	pool, _ := postgres.GetPool()
	schema := postgres.DefaultSchema
	if config, err := postgres.LoadConfig(); err == nil {
		schema = config.DatabaseSchema
	}

	return NewWithDependencies(ctx, pool, schema, cloudflare_service.New())
}

// 🧪 NewWithDependencies keeps workspace logic testable without application globals.
func NewWithDependencies(
	ctx context.Context,
	database *pgxpool.Pool,
	schema string,
	cloud *cloudflare_service.Service,
) *Service {
	var repo workspaceRepository
	if database != nil {
		repo = workspace_repository.NewWorkspaceItemRepository(database, schema)
	}
	var storage workspaceCloudStorage
	if cloud != nil {
		storage = cloud
	}

	return &Service{
		ctx:   ctx,
		repo:  repo,
		cloud: storage,
	}
}

// ➕ Create creates a folder or document owned by the authenticated user.
func (service *Service) Create(
	userID string,
	params models.CreateWorkspaceItemParams,
) (models.WorkspaceItem, error) {
	if err := validateCreateParams(params); err != nil {
		return models.WorkspaceItem{}, err
	}
	if err := service.requireRepository(); err != nil {
		return models.WorkspaceItem{}, err
	}

	item, err := service.repo.Create(service.ctx, userID, params)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("create workspace item: %w", err)
	}

	return item, nil
}

// 📚 List returns all active items owned by the authenticated user.
func (service *Service) List(userID string) ([]models.WorkspaceItem, error) {
	if err := service.requireRepository(); err != nil {
		return nil, err
	}

	items, err := service.repo.List(service.ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("list workspace items: %w", err)
	}

	return items, nil
}

// 🔍 Get returns one active item after ownership is checked by the repository.
func (service *Service) Get(userID, itemID string) (models.WorkspaceItem, error) {
	if err := service.requireRepository(); err != nil {
		return models.WorkspaceItem{}, err
	}

	item, err := service.repo.Get(service.ctx, userID, itemID)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("get workspace item: %w", err)
	}

	return item, nil
}

// ✏️ Update handles rename, move, favorite, icon and color changes.
func (service *Service) Update(
	userID string,
	params models.UpdateWorkspaceItemParams,
) (models.WorkspaceItem, error) {
	if strings.TrimSpace(params.Name) == "" {
		return models.WorkspaceItem{}, errors.New("workspace item name cannot be empty")
	}
	if err := service.requireRepository(); err != nil {
		return models.WorkspaceItem{}, err
	}

	item, err := service.repo.Update(service.ctx, userID, params)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("update workspace item: %w", err)
	}

	return item, nil
}

// Delete removes all R2 objects in an item subtree before physically deleting its rows.
func (service *Service) Delete(userID, itemID string) (int, error) {
	if err := service.requireRepository(); err != nil {
		return 0, err
	}

	objectKeys, err := service.repo.CollectSubtreeR2ObjectKeys(service.ctx, userID, itemID)
	if err != nil {
		return 0, fmt.Errorf("collect workspace item objects: %w", err)
	}

	if len(objectKeys) > 0 {
		if service.cloud == nil {
			return 0, cloudflare_service.ErrStorageNotInitialized
		}
		if err := service.cloud.DeleteObjects(service.ctx, objectKeys); err != nil {
			return 0, fmt.Errorf("delete workspace item objects: %w", err)
		}
	}

	deletedCount, err := service.repo.Delete(service.ctx, userID, itemID)
	if err != nil {
		return 0, fmt.Errorf("delete workspace item: %w", err)
	}

	return deletedCount, nil
}

// CompleteDocumentUpload records the R2 metadata after a direct upload succeeds.
func (service *Service) CompleteDocumentUpload(
	userID string,
	documentID string,
	params models.CompleteDocumentUploadParams,
) (models.WorkspaceItem, error) {
	params.DocumentID = documentID
	params.R2ObjectKey = strings.TrimSpace(params.R2ObjectKey)
	params.ContentType = strings.TrimSpace(params.ContentType)
	params.ContentHash = strings.TrimSpace(params.ContentHash)

	if err := validateCompleteUploadParams(params); err != nil {
		return models.WorkspaceItem{}, err
	}
	if err := service.requireRepository(); err != nil {
		return models.WorkspaceItem{}, err
	}

	item, err := service.repo.Get(service.ctx, userID, documentID)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("complete document upload: %w", err)
	}
	if item.Type != models.WorkspaceItemTypeDocument {
		return models.WorkspaceItem{}, ErrWorkspaceItemNotDocument
	}

	expectedObjectKey, err := cloudflare_service.BuildDocumentObjectKey(userID, documentID)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("complete document upload: %w", err)
	}
	if params.R2ObjectKey != expectedObjectKey {
		return models.WorkspaceItem{}, ErrWorkspaceDocumentObjectKeyInvalid
	}

	completedItem, err := service.repo.CompleteDocumentUpload(service.ctx, userID, params)
	if err != nil {
		return models.WorkspaceItem{}, fmt.Errorf("complete document upload: %w", err)
	}

	return completedItem, nil
}

// ☁️ GenerateDocumentUploadURL verifies the item before exposing an R2 URL.
func (service *Service) GenerateDocumentUploadURL(
	userID string,
	documentID string,
	contentType string,
) (cloudflare_service.PresignedDocumentURL, error) {
	item, err := service.Get(userID, documentID)
	if err != nil {
		return cloudflare_service.PresignedDocumentURL{}, err
	}
	if item.Type != models.WorkspaceItemTypeDocument {
		return cloudflare_service.PresignedDocumentURL{}, ErrWorkspaceItemNotDocument
	}
	if service.cloud == nil {
		return cloudflare_service.PresignedDocumentURL{}, cloudflare_service.ErrStorageNotInitialized
	}

	url, err := service.cloud.GenerateDocumentUploadURL(service.ctx, userID, documentID, contentType)
	if err != nil {
		return cloudflare_service.PresignedDocumentURL{}, fmt.Errorf("generate workspace document upload URL: %w", err)
	}

	return url, nil
}

// 📥 GenerateDocumentDownloadURL verifies ownership before exposing an R2 URL.
func (service *Service) GenerateDocumentDownloadURL(
	userID string,
	documentID string,
) (cloudflare_service.PresignedDocumentURL, error) {
	item, err := service.Get(userID, documentID)
	if err != nil {
		return cloudflare_service.PresignedDocumentURL{}, err
	}
	if item.Type != models.WorkspaceItemTypeDocument {
		return cloudflare_service.PresignedDocumentURL{}, ErrWorkspaceItemNotDocument
	}
	if service.cloud == nil {
		return cloudflare_service.PresignedDocumentURL{}, cloudflare_service.ErrStorageNotInitialized
	}

	url, err := service.cloud.GenerateDocumentDownloadURL(service.ctx, userID, documentID)
	if err != nil {
		return cloudflare_service.PresignedDocumentURL{}, fmt.Errorf("generate workspace document download URL: %w", err)
	}

	return url, nil
}

func (service *Service) requireRepository() error {
	if service == nil || service.repo == nil {
		return ErrWorkspaceDatabaseUnavailable
	}

	return nil
}

func validateCreateParams(params models.CreateWorkspaceItemParams) error {
	if strings.TrimSpace(params.Name) == "" {
		return errors.New("workspace item name cannot be empty")
	}

	if params.Type != models.WorkspaceItemTypeFolder && params.Type != models.WorkspaceItemTypeDocument {
		return errors.New("workspace item type is invalid")
	}

	return nil
}

func validateCompleteUploadParams(params models.CompleteDocumentUploadParams) error {
	if params.R2ObjectKey == "" {
		return errors.New("document object key cannot be empty")
	}
	if params.ContentType == "" {
		return errors.New("document content type cannot be empty")
	}
	if params.SizeBytes < 0 {
		return errors.New("document size is invalid")
	}
	if params.ContentHash == "" {
		return errors.New("document content hash cannot be empty")
	}
	if params.ContentRevision < 0 {
		return errors.New("document content revision is invalid")
	}

	return nil
}
