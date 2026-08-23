package main

import (
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/andrew/md-pdf-preview/server/src/config/cloudflare"
	"github.com/andrew/md-pdf-preview/server/src/config/environment"
	"github.com/andrew/md-pdf-preview/server/src/config/logging"
	"github.com/andrew/md-pdf-preview/server/src/config/postgres"
	"github.com/andrew/md-pdf-preview/server/src/config/server"
)

func main() {
	start := time.Now()
	logging.Printf("🚀 [startup] server starting at %s", start.Format("15:04:05"))

	if err := environment.Load(".env"); err != nil {
		logging.Printf("⚠️ [environment] failed to load .env: %v", err)
	}

	cloudflare.InitR2()

	// PostgreSQL starts independently so a database outage never blocks Echo.
	go postgres.CreateConnectionPool()

	// Close shared resources when the process receives a termination signal.
	go listenForShutdown()

	server.NewServer()
	server.StartRoutes()

	logging.Printf("✅ [startup] server initialized in %s", time.Since(start))
	server.StartServer()
}

func listenForShutdown() {
	shutdownSignal := make(chan os.Signal, 1)
	signal.Notify(shutdownSignal, os.Interrupt, syscall.SIGTERM)
	defer signal.Stop(shutdownSignal)

	<-shutdownSignal
	logging.Println("🛑 [shutdown] signal received")

	server.StopServer(10 * time.Second)
	postgres.CloseConnectionPool()
}
