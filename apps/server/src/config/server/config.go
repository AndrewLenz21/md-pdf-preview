package server

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/andrew/md-pdf-preview/server/src/config/middlewares"
	logger_service "github.com/andrew/md-pdf-preview/server/src/services/logger"
	"github.com/labstack/echo/v4"
)

var (
	ErrServerClosed   = http.ErrServerClosed
	applicationServer *echo.Echo
	requestLogger     *logger_service.Service
)

func NewServer() {
	applicationServer = echo.New()
	requestLogger = logger_service.New()
	requestLogger.Start()
	applicationServer.Use(requestLogger.RequestLogger())
	applicationServer.Use(middlewares.InternalAPIKey())
	applicationServer.Use(middlewares.RateLimit())
}

func StartServer() {
	if applicationServer == nil {
		fmt.Println("[http] startup failed: Echo server is not initialized")
		return
	}

	fmt.Printf("[http] Echo server listening on %s\n", Address())
	if err := applicationServer.Start(Address()); err != nil && !errors.Is(err, ErrServerClosed) {
		fmt.Printf("[http] server stopped unexpectedly: %v\n", err)
	}
}

func Address() string {
	port := strings.TrimSpace(os.Getenv("SERVER_PORT"))
	if port == "" {
		port = "8080"
	}

	return ":" + port
}

func GetServer() *echo.Echo {
	return applicationServer
}

func StopServer(timeout time.Duration) {
	if applicationServer == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	shutdownErr := applicationServer.Shutdown(ctx)
	if requestLogger != nil {
		if err := requestLogger.Stop(ctx); err != nil {
			fmt.Printf("[logger] graceful shutdown failed: %v\n", err)
		}
	}
	if shutdownErr != nil {
		fmt.Printf("[http] graceful shutdown failed: %v\n", shutdownErr)
		return
	}

	fmt.Println("[http] Echo server stopped")
}
