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

func TestAccountDeletionCompletionAnonymizesRequestLogIdentity(t *testing.T) {
	server := echo.New()
	request := httptest.NewRequest("DELETE", "/account/cloud-data", nil)
	request.Header.Set("X-User-Id", "deleted-user")
	context := server.NewContext(request, httptest.NewRecorder())

	if userID := userIDFromContext(context); userID == nil {
		t.Fatal("request should initially contain the trusted user ID")
	}

	MarkAccountDeletionCompleted(context)
	if !isAccountDeletionCompleted(context) {
		t.Fatal("account deletion completion marker was not set")
	}
	if userID := userIDForRequestLog(context); userID != nil {
		t.Fatalf("request log user ID = %q, want nil", *userID)
	}
	if isAccountDeletionCompleted(server.NewContext(
		httptest.NewRequest("DELETE", "/account/cloud-data", nil),
		httptest.NewRecorder(),
	)) {
		t.Fatal("account deletion marker leaked between requests")
	}
}
