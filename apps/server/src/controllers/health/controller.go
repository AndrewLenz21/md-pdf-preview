package health

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

func RegisterRoutes(router *echo.Echo) {
	router.GET("/health", getHealth)
}

func getHealth(context echo.Context) error {
	return context.JSON(http.StatusOK, map[string]string{"status": "ok"})
}
