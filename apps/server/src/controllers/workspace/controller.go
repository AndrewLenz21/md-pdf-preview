package workspace

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/andrew/md-pdf-preview/server/src/models"
	cloudflare_service "github.com/andrew/md-pdf-preview/server/src/services/cloudflare"
	workspace_service "github.com/andrew/md-pdf-preview/server/src/services/workspaces"
	"github.com/jackc/pgx/v5"
	"github.com/labstack/echo/v4"
)

type workspaceService interface {
	Create(string, models.CreateWorkspaceItemParams) (models.WorkspaceItem, error)
	List(string) ([]models.WorkspaceItem, error)
	Get(string, string) (models.WorkspaceItem, error)
	Update(string, models.UpdateWorkspaceItemParams) (models.WorkspaceItem, error)
	Delete(string, string) (int, error)
	CompleteDocumentUpload(string, string, models.CompleteDocumentUploadParams) (models.WorkspaceItem, error)
	GenerateDocumentUploadURL(string, string, string) (cloudflare_service.PresignedDocumentURL, error)
	GenerateDocumentDownloadURL(string, string) (cloudflare_service.PresignedDocumentURL, error)
}

type Controller struct {
	newService func(context.Context) workspaceService
}

type createItemRequest struct {
	ParentID *string `json:"parentId"`
	Name     string  `json:"name"`
	Type     string  `json:"type"`
	Color    *string `json:"color"`
	Icon     *string `json:"icon"`
}

type updateItemRequest struct {
	Name      string  `json:"name"`
	ParentID  *string `json:"parentId"`
	Color     *string `json:"color"`
	Icon      *string `json:"icon"`
	Favorite  bool    `json:"favorite"`
	SortOrder int     `json:"sortOrder"`
}

type uploadURLRequest struct {
	ContentType string `json:"contentType"`
}

type completeUploadRequest struct {
	ObjectKey       string `json:"objectKey"`
	ContentType     string `json:"contentType"`
	SizeBytes       int64  `json:"sizeBytes"`
	ContentHash     string `json:"contentHash"`
	ContentRevision int64  `json:"contentRevision"`
}

type presignedURLResponse struct {
	ObjectKey string `json:"objectKey"`
	URL       string `json:"url"`
}

// New creates a controller backed by the application workspace service.
func New() *Controller {
	return &Controller{
		newService: func(ctx context.Context) workspaceService {
			return workspace_service.New(ctx)
		},
	}
}

// NewWithServiceFactory keeps controller handlers isolated from infrastructure in tests.
func NewWithServiceFactory(factory func(context.Context) workspaceService) *Controller {
	return &Controller{newService: factory}
}

func RegisterRoutes(router *echo.Echo) {
	controller := New()
	controller.RegisterRoutes(router)
}

func (controller *Controller) RegisterRoutes(router *echo.Echo) {
	workspaceRoutes := router.Group("/workspace")

	workspaceRoutes.GET("/items", controller.list)
	workspaceRoutes.POST("/items", controller.create)
	workspaceRoutes.GET("/items/:itemID", controller.get)
	workspaceRoutes.PATCH("/items/:itemID", controller.update)
	workspaceRoutes.DELETE("/items/:itemID", controller.delete)
	workspaceRoutes.POST("/documents/:documentID/upload-url", controller.generateUploadURL)
	workspaceRoutes.POST("/documents/:documentID/upload-complete", controller.completeUpload)
	workspaceRoutes.GET("/documents/:documentID/download-url", controller.generateDownloadURL)
}

func (controller *Controller) list(context echo.Context) error {
	userID, err := authenticatedUserID(context)
	if err != nil {
		return err
	}

	items, err := controller.service(context).List(userID)
	if err != nil {
		return controller.handleServiceError(err)
	}

	return context.JSON(http.StatusOK, items)
}

func (controller *Controller) create(context echo.Context) error {
	userID, err := authenticatedUserID(context)
	if err != nil {
		return err
	}

	var request createItemRequest
	if err := context.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid workspace item payload").SetInternal(err)
	}

	item, err := controller.service(context).Create(userID, models.CreateWorkspaceItemParams{
		ParentID: request.ParentID,
		Name:     request.Name,
		Type:     request.Type,
		Color:    request.Color,
		Icon:     request.Icon,
	})
	if err != nil {
		return controller.handleServiceError(err)
	}

	return context.JSON(http.StatusCreated, item)
}

func (controller *Controller) get(context echo.Context) error {
	userID, err := authenticatedUserID(context)
	if err != nil {
		return err
	}

	item, err := controller.service(context).Get(userID, context.Param("itemID"))
	if err != nil {
		return controller.handleServiceError(err)
	}

	return context.JSON(http.StatusOK, item)
}

func (controller *Controller) update(context echo.Context) error {
	userID, err := authenticatedUserID(context)
	if err != nil {
		return err
	}

	var request updateItemRequest
	if err := context.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid workspace item payload").SetInternal(err)
	}

	item, err := controller.service(context).Update(userID, models.UpdateWorkspaceItemParams{
		ItemID:    context.Param("itemID"),
		Name:      request.Name,
		ParentID:  request.ParentID,
		Color:     request.Color,
		Icon:      request.Icon,
		Favorite:  request.Favorite,
		SortOrder: request.SortOrder,
	})
	if err != nil {
		return controller.handleServiceError(err)
	}

	return context.JSON(http.StatusOK, item)
}

func (controller *Controller) delete(context echo.Context) error {
	userID, err := authenticatedUserID(context)
	if err != nil {
		return err
	}

	deletedCount, err := controller.service(context).Delete(userID, context.Param("itemID"))
	if err != nil {
		return controller.handleServiceError(err)
	}

	return context.JSON(http.StatusOK, map[string]int{"deletedCount": deletedCount})
}

func (controller *Controller) generateUploadURL(context echo.Context) error {
	userID, err := authenticatedUserID(context)
	if err != nil {
		return err
	}

	var request uploadURLRequest
	if err := context.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid upload payload").SetInternal(err)
	}

	result, err := controller.service(context).GenerateDocumentUploadURL(
		userID,
		context.Param("documentID"),
		request.ContentType,
	)
	if err != nil {
		return controller.handleServiceError(err)
	}

	return context.JSON(http.StatusOK, presignedURLResponse{
		ObjectKey: result.ObjectKey,
		URL:       result.URL,
	})
}

func (controller *Controller) generateDownloadURL(context echo.Context) error {
	userID, err := authenticatedUserID(context)
	if err != nil {
		return err
	}

	result, err := controller.service(context).GenerateDocumentDownloadURL(
		userID,
		context.Param("documentID"),
	)
	if err != nil {
		return controller.handleServiceError(err)
	}

	return context.JSON(http.StatusOK, presignedURLResponse{
		ObjectKey: result.ObjectKey,
		URL:       result.URL,
	})
}

func (controller *Controller) completeUpload(context echo.Context) error {
	userID, err := authenticatedUserID(context)
	if err != nil {
		return err
	}

	var request completeUploadRequest
	if err := context.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid upload completion payload").SetInternal(err)
	}

	item, err := controller.service(context).CompleteDocumentUpload(
		userID,
		context.Param("documentID"),
		models.CompleteDocumentUploadParams{
			R2ObjectKey:     request.ObjectKey,
			ContentType:     request.ContentType,
			SizeBytes:       request.SizeBytes,
			ContentHash:     request.ContentHash,
			ContentRevision: request.ContentRevision,
		},
	)
	if err != nil {
		return controller.handleServiceError(err)
	}

	return context.JSON(http.StatusOK, item)
}

func (controller *Controller) service(context echo.Context) workspaceService {
	return controller.newService(context.Request().Context())
}

func (controller *Controller) handleServiceError(err error) error {
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return echo.NewHTTPError(http.StatusNotFound, "workspace item not found").SetInternal(err)
	case errors.Is(err, workspace_service.ErrWorkspaceDatabaseUnavailable):
		return echo.NewHTTPError(http.StatusServiceUnavailable, "workspace database is unavailable").SetInternal(err)
	case errors.Is(err, cloudflare_service.ErrStorageNotInitialized):
		return echo.NewHTTPError(http.StatusServiceUnavailable, "workspace storage is unavailable").SetInternal(err)
	case errors.Is(err, workspace_service.ErrWorkspaceItemNotDocument),
		errors.Is(err, workspace_service.ErrWorkspaceDocumentObjectKeyInvalid):
		return echo.NewHTTPError(http.StatusBadRequest, err.Error()).SetInternal(err)
	case strings.Contains(err.Error(), "invalid") || strings.Contains(err.Error(), "cannot be empty"):
		return echo.NewHTTPError(http.StatusBadRequest, err.Error()).SetInternal(err)
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, "workspace operation failed").SetInternal(err)
	}
}

func authenticatedUserID(context echo.Context) (string, error) {
	if value := context.Get("user_id"); value != nil {
		if userID, ok := value.(string); ok && strings.TrimSpace(userID) != "" {
			return strings.TrimSpace(userID), nil
		}
		if userID, ok := value.(*string); ok && userID != nil && strings.TrimSpace(*userID) != "" {
			return strings.TrimSpace(*userID), nil
		}
	}

	// The BFF may pass the verified Better Auth identity through this trusted header.
	if userID := strings.TrimSpace(context.Request().Header.Get("X-User-Id")); userID != "" {
		return userID, nil
	}

	return "", echo.NewHTTPError(http.StatusUnauthorized, "authenticated user is required")
}
