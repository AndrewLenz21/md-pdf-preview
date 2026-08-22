package middlewares

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestInternalAPIKeyRejectsMissingConfiguration(t *testing.T) {
	t.Setenv("INTERNAL_API_KEY", "")

	server := echo.New()
	handler := InternalAPIKey()(func(context echo.Context) error {
		return context.NoContent(http.StatusNoContent)
	})
	recorder := httptest.NewRecorder()
	context := server.NewContext(httptest.NewRequest(http.MethodGet, "/", nil), recorder)

	if err := handler(context); err != nil {
		t.Fatalf("handler error = %v", err)
	}
	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusServiceUnavailable)
	}
}

func TestInternalAPIKeyRejectsInvalidKey(t *testing.T) {
	t.Setenv("INTERNAL_API_KEY", "expected-secret")

	server := echo.New()
	handler := InternalAPIKey()(func(context echo.Context) error {
		return context.NoContent(http.StatusNoContent)
	})
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.Header.Set(internalAPIKeyHeader, "wrong-secret")
	recorder := httptest.NewRecorder()
	context := server.NewContext(request, recorder)

	if err := handler(context); err != nil {
		t.Fatalf("handler error = %v", err)
	}
	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusUnauthorized)
	}
}

func TestInternalAPIKeyAllowsValidKey(t *testing.T) {
	t.Setenv("INTERNAL_API_KEY", "expected-secret")

	server := echo.New()
	handler := InternalAPIKey()(func(context echo.Context) error {
		return context.NoContent(http.StatusNoContent)
	})
	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request.Header.Set(internalAPIKeyHeader, "expected-secret")
	recorder := httptest.NewRecorder()
	context := server.NewContext(request, recorder)

	if err := handler(context); err != nil {
		t.Fatalf("handler error = %v", err)
	}
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusNoContent)
	}
}

func TestConstantTimeEqualRequiresSameValueAndLength(t *testing.T) {
	if !constantTimeEqual("secret", "secret") {
		t.Fatal("equal values should match")
	}
	if constantTimeEqual("secret", "different") {
		t.Fatal("different values should not match")
	}
	if constantTimeEqual("secret", "secret ") {
		t.Fatal("different lengths should not match")
	}
}
