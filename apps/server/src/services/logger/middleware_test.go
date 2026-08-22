package logger_service

import (
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestUserIDFromContextUsesBFFHeader(t *testing.T) {
	server := echo.New()
	request := httptest.NewRequest("GET", "/workspace/items", nil)
	request.Header.Set("X-User-Id", " user-123 ")
	context := server.NewContext(request, httptest.NewRecorder())

	userID := userIDFromContext(context)
	if userID == nil || *userID != "user-123" {
		t.Fatalf("user ID = %v, want user-123", userID)
	}
}

func TestUserIDFromContextPrefersContextValue(t *testing.T) {
	server := echo.New()
	request := httptest.NewRequest("GET", "/workspace/items", nil)
	request.Header.Set("X-User-Id", "header-user")
	context := server.NewContext(request, httptest.NewRecorder())
	context.Set("user_id", "context-user")

	userID := userIDFromContext(context)
	if userID == nil || *userID != "context-user" {
		t.Fatalf("user ID = %v, want context-user", userID)
	}
}
