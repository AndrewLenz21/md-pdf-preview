package server

import (
	"github.com/andrew/md-pdf-preview/server/src/config/logging"
	"github.com/andrew/md-pdf-preview/server/src/controllers/account"
	"github.com/andrew/md-pdf-preview/server/src/controllers/health"
	"github.com/andrew/md-pdf-preview/server/src/controllers/workspace"
)

func StartRoutes() {
	applicationServer := GetServer()
	if applicationServer == nil {
		logging.Println("❌ [http] routes were not registered: Echo server is not initialized")
		return
	}

	health.RegisterRoutes(applicationServer)
	workspace.RegisterRoutes(applicationServer)
	account.RegisterRoutes(applicationServer)
}
