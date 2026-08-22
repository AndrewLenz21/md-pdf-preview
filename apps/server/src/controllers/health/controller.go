package health

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// 📋 RegisterRoutes registers the health check endpoint.
func RegisterRoutes(router *echo.Echo) {
	router.GET("/health", getHealth)
}

// 🚀 getHealth implements the health check handler.
func getHealth(context echo.Context) error {
	return context.JSON(http.StatusOK, map[string]string{"status": "ok"})
}
