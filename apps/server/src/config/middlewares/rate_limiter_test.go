package middlewares

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/labstack/echo/v4"
)

func TestUserRateLimitStoreAllows300RequestsPerWindow(t *testing.T) {
	store := NewUserRateLimitStore(300, time.Minute)
	store.timeNow = func() time.Time {
		return time.Date(2026, time.August, 23, 12, 0, 0, 0, time.UTC)
	}

	for index := 0; index < 300; index++ {
		allowed, err := store.Allow("user:user-123")
		if err != nil {
			t.Fatalf("Allow() error = %v", err)
		}
		if !allowed {
			t.Fatalf("request %d should be allowed", index+1)
		}
	}

	allowed, err := store.Allow("user:user-123")
	if err != nil {
		t.Fatalf("Allow() error = %v", err)
	}
	if allowed {
		t.Fatal("301st request should be rejected")
	}
}

func TestUserRateLimitStoreSeparatesUsersAndResetsWindow(t *testing.T) {
	store := NewUserRateLimitStore(1, time.Minute)
	now := time.Date(2026, time.August, 23, 12, 0, 0, 0, time.UTC)
	store.timeNow = func() time.Time { return now }

	allowed, _ := store.Allow("user:user-123")
	if !allowed {
		t.Fatal("first request should be allowed")
	}

	allowed, _ = store.Allow("user:user-456")
	if !allowed {
		t.Fatal("a different user should have an independent limit")
	}

	now = now.Add(time.Minute)
	allowed, _ = store.Allow("user:user-123")
	if !allowed {
		t.Fatal("request should be allowed after the window resets")
	}
}

func TestRateLimitReturnsTooManyRequests(t *testing.T) {
	store := NewUserRateLimitStore(1, time.Minute)
	config := echo.New()
	limiter := newRateLimitMiddleware(store)
	handler := limiter(func(context echo.Context) error {
		return context.NoContent(http.StatusNoContent)
	})

	first := httptest.NewRecorder()
	firstContext := config.NewContext(httptest.NewRequest(http.MethodGet, "/", nil), first)
	firstContext.Set("user_id", "user-123")
	if err := handler(firstContext); err != nil {
		t.Fatalf("first request error = %v", err)
	}

	second := httptest.NewRecorder()
	secondContext := config.NewContext(httptest.NewRequest(http.MethodGet, "/", nil), second)
	secondContext.Set("user_id", "user-123")
	if err := handler(secondContext); err != nil {
		t.Fatalf("second request error = %v", err)
	}
	if second.Code != http.StatusTooManyRequests {
		t.Fatalf("second request status = %d, want %d", second.Code, http.StatusTooManyRequests)
	}
}
