package server

import (
	"fmt"

	"github.com/andrew/md-pdf-preview/server/src/controllers/health"
)

func StartRoutes() {
	applicationServer := GetServer()
	if applicationServer == nil {
		fmt.Println("[http] routes were not registered: Echo server is not initialized")
		return
	}

	health.RegisterRoutes(applicationServer)
}
