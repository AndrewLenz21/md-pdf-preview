package middlewares

import (
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/labstack/echo/v4"
	echo_middleware "github.com/labstack/echo/v4/middleware"
)

const (
	requestsPerUserWindow = 300
	userRateLimitWindow   = time.Minute
)

// RateLimit limits each authenticated user to 300 requests per one-minute window.
// This in-memory store is intentionally sufficient for the current small app when
// Go runs as one instance. It protects against loops, retries and bots without
// adding infrastructure; use a shared store such as Redis if Go is replicated.
// Requests without an authenticated user are grouped by client IP.
func RateLimit() echo.MiddlewareFunc {
	return newRateLimitMiddleware(NewUserRateLimitStore(requestsPerUserWindow, userRateLimitWindow))
}

func newRateLimitMiddleware(store *UserRateLimitStore) echo.MiddlewareFunc {
	config := echo_middleware.RateLimiterConfig{
		Skipper: echo_middleware.DefaultSkipper,
		Store:   store,
		IdentifierExtractor: func(context echo.Context) (string, error) {
			if userID := authenticatedUserID(context); userID != "" {
				return "user:" + userID, nil
			}

			return "ip:" + context.RealIP(), nil
		},
		ErrorHandler: func(context echo.Context, err error) error {
			return context.JSON(http.StatusForbidden, map[string]string{
				"code":    "RATE_LIMIT_IDENTIFIER_ERROR",
				"message": "Unable to identify the request source.",
			})
		},
		DenyHandler: func(context echo.Context, _ string, _ error) error {
			context.Response().Header().Set("Retry-After", "60")
			return context.JSON(http.StatusTooManyRequests, map[string]string{
				"code":    "RATE_LIMIT_EXCEEDED",
				"message": "Too many requests. Please try again later.",
			})
		},
	}

	return echo_middleware.RateLimiterWithConfig(config)
}

type UserRateLimitStore struct {
	limit     int
	window    time.Duration
	visitors  map[string]rateLimitWindow
	mutex     sync.Mutex
	lastClean time.Time
	timeNow   func() time.Time
}

type rateLimitWindow struct {
	startedAt time.Time
	count     int
}

func NewUserRateLimitStore(limit int, window time.Duration) *UserRateLimitStore {
	if limit <= 0 {
		limit = requestsPerUserWindow
	}
	if window <= 0 {
		window = userRateLimitWindow
	}

	now := time.Now()
	return &UserRateLimitStore{
		limit:     limit,
		window:    window,
		visitors:  make(map[string]rateLimitWindow),
		lastClean: now,
		timeNow:   time.Now,
	}
}

// Allow implements Echo's RateLimiterStore using fixed one-minute windows.
// The counter is process-local by design and is not a distributed quota.
func (store *UserRateLimitStore) Allow(identifier string) (bool, error) {
	if store == nil {
		return false, fmt.Errorf("rate limit store is not initialized")
	}

	now := store.timeNow()
	store.mutex.Lock()
	defer store.mutex.Unlock()

	if now.Sub(store.lastClean) >= store.window {
		for key, visitor := range store.visitors {
			if now.Sub(visitor.startedAt) >= store.window {
				delete(store.visitors, key)
			}
		}
		store.lastClean = now
	}

	visitor, exists := store.visitors[identifier]
	if !exists || now.Sub(visitor.startedAt) >= store.window {
		store.visitors[identifier] = rateLimitWindow{startedAt: now, count: 1}
		return true, nil
	}

	if visitor.count >= store.limit {
		return false, nil
	}

	visitor.count++
	store.visitors[identifier] = visitor
	return true, nil
}

func authenticatedUserID(context echo.Context) string {
	if value := context.Get("user_id"); value != nil {
		if userID, ok := value.(string); ok {
			if userID = safeIdentifier(userID); userID != "" {
				return userID
			}
		}
		if userID, ok := value.(*string); ok && userID != nil {
			if safeID := safeIdentifier(*userID); safeID != "" {
				return safeID
			}
		}
	}

	// This header is intended for the trusted Hono/BFF to Go handoff.
	return safeIdentifier(context.Request().Header.Get("X-User-Id"))
}

func safeIdentifier(value string) string {
	value = strings.TrimSpace(value)
	if value == "" || len(value) > 128 || strings.ContainsAny(value, "/\\\r\n\t ") {
		return ""
	}

	return value
}
