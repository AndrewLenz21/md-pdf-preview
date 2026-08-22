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

type Service struct {
	ctx   context.Context
	repo  *workspace_repository.WorkspaceItemRepository
	cloud *cloudflare_service.Service
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
	var repo *workspace_repository.WorkspaceItemRepository
	if database != nil {
		repo = workspace_repository.NewWorkspaceItemRepository(database, schema)
	}

	return &Service{
		ctx:   ctx,
		repo:  repo,
		cloud: cloud,
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

// 🗑️ Delete soft deletes an item and its descendants.
func (service *Service) Delete(userID, itemID string) (int, error) {
	if err := service.requireRepository(); err != nil {
		return 0, err
	}

	deletedCount, err := service.repo.Delete(service.ctx, userID, itemID)
	if err != nil {
		return 0, fmt.Errorf("delete workspace item: %w", err)
	}

	return deletedCount, nil
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
		return cloudflare_service.PresignedDocumentURL{}, errors.New("workspace item is not a document")
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
		return cloudflare_service.PresignedDocumentURL{}, errors.New("workspace item is not a document")
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
