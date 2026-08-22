package middlewares

import (
	"crypto/subtle"
	"net/http"
	"os"
	"strings"

	"github.com/labstack/echo/v4"
)

const internalAPIKeyHeader = "X-Api-Key"

// InternalAPIKey protects the Go API from requests that do not come through
// the trusted Hono/Cloudflare server-to-server handoff.
func InternalAPIKey() echo.MiddlewareFunc {
	expectedKey := strings.TrimSpace(os.Getenv("INTERNAL_API_KEY"))

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(context echo.Context) error {
			if expectedKey == "" {
				return context.JSON(http.StatusServiceUnavailable, map[string]string{
					"code":    "INTERNAL_API_KEY_NOT_CONFIGURED",
					"message": "Internal API authentication is not configured.",
				})
			}

			providedKey := strings.TrimSpace(context.Request().Header.Get(internalAPIKeyHeader))
			if !constantTimeEqual(providedKey, expectedKey) {
				return context.JSON(http.StatusUnauthorized, map[string]string{
					"code":    "INTERNAL_API_KEY_INVALID",
					"message": "Internal API authentication failed.",
				})
			}

			return next(context)
		}
	}
}

func constantTimeEqual(provided, expected string) bool {
	if len(provided) != len(expected) {
		return false
	}

	return subtle.ConstantTimeCompare([]byte(provided), []byte(expected)) == 1
}
