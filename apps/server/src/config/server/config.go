package server

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

var (
	ErrServerClosed   = http.ErrServerClosed
	applicationServer *echo.Echo
)

func NewServer() {
	applicationServer = echo.New()
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

	if err := applicationServer.Shutdown(ctx); err != nil {
		fmt.Printf("[http] graceful shutdown failed: %v\n", err)
		return
	}

	fmt.Println("[http] Echo server stopped")
}
