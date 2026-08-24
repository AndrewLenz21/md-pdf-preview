package account

import (
	"context"
	"errors"
	"net/http"

	workspace_controller "github.com/andrew/md-pdf-preview/server/src/controllers/workspace"
	cloudflare_service "github.com/andrew/md-pdf-preview/server/src/services/cloudflare"
	logger_service "github.com/andrew/md-pdf-preview/server/src/services/logger"
	workspace_service "github.com/andrew/md-pdf-preview/server/src/services/workspaces"
	"github.com/labstack/echo/v4"
)

type accountService interface {
	DeleteCloudData(string) error
}

type Controller struct {
	newService func(context.Context) accountService
}

func New() *Controller {
	return &Controller{
		newService: func(ctx context.Context) accountService {
			return workspace_service.New(ctx)
		},
	}
}

func NewWithServiceFactory(factory func(context.Context) accountService) *Controller {
	return &Controller{newService: factory}
}

func RegisterRoutes(router *echo.Echo) {
	controller := New()
	controller.RegisterRoutes(router)
}

func (controller *Controller) RegisterRoutes(router *echo.Echo) {
	router.DELETE("/account/cloud-data", controller.deleteCloudData)
}

func (controller *Controller) deleteCloudData(context echo.Context) error {
	userID, err := workspace_controller.AuthenticatedUserID(context)
	if err != nil {
		return err
	}

	if err := controller.newService(context.Request().Context()).DeleteCloudData(userID); err != nil {
		switch {
		case errors.Is(err, workspace_service.ErrAccountDeletionInProgress):
			return echo.NewHTTPError(http.StatusConflict, "account deletion is already in progress").SetInternal(err)
		case errors.Is(err, workspace_service.ErrWorkspaceDatabaseUnavailable),
			errors.Is(err, cloudflare_service.ErrStorageNotInitialized):
			return echo.NewHTTPError(http.StatusServiceUnavailable, "account cleanup is unavailable").SetInternal(err)
		default:
			return echo.NewHTTPError(http.StatusInternalServerError, "account cleanup failed").SetInternal(err)
		}
	}

	logger_service.MarkAccountDeletionCompleted(context)
	return context.NoContent(http.StatusNoContent)
}
