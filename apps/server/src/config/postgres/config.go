package postgres

import (
	"context"
	"sync"
	"time"

	"github.com/andrew/md-pdf-preview/server/src/config/logging"
	"github.com/andrew/md-pdf-preview/server/src/config/postgres/migrations"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	pool       *pgxpool.Pool
	poolMutex  sync.RWMutex
	poolClosed bool
)

func CreateConnectionPool() {
	databaseConfig, err := LoadConfig()
	if err != nil {
		logging.Printf("❌ [postgres] startup failed: %v", err)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	logging.Printf("🐘 [postgres] creating connection pool for schema %s", databaseConfig.DatabaseSchema)

	poolConfig, err := pgxpool.ParseConfig(databaseConfig.DatabaseURL)
	if err != nil {
		logging.Printf("❌ [postgres] startup failed: parse database configuration: %v", err)
		return
	}

	poolConfig.ConnConfig.RuntimeParams["search_path"] = databaseConfig.DatabaseSchema
	poolConfig.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeCacheDescribe

	databasePool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		logging.Printf("❌ [postgres] startup failed: open database pool: %v", err)
		return
	}

	if err := databasePool.Ping(ctx); err != nil {
		databasePool.Close()
		logging.Printf("❌ [postgres] startup failed: database ping failed: %v", err)
		return
	}

	if err := migrations.BootstrapSchema(ctx, databasePool, databaseConfig.DatabaseSchema); err != nil {
		databasePool.Close()
		logging.Printf("❌ [postgres] startup failed: database bootstrap failed: %v", err)
		return
	}

	poolMutex.Lock()
	if poolClosed {
		poolMutex.Unlock()
		databasePool.Close()
		logging.Println("⚠️ [postgres] startup cancelled during shutdown")
		return
	}

	pool = databasePool
	poolMutex.Unlock()
	logging.Printf("✅ [postgres] pool connected; schema %s and Better Auth tables are ready", databaseConfig.DatabaseSchema)
}

func GetPool() (*pgxpool.Pool, bool) {
	poolMutex.RLock()
	defer poolMutex.RUnlock()

	if pool == nil {
		return nil, false
	}

	return pool, true
}

func CloseConnectionPool() {
	poolMutex.Lock()
	databasePool := pool
	pool = nil
	poolClosed = true
	poolMutex.Unlock()

	if databasePool == nil {
		logging.Println("⚠️ [postgres] pool was not initialized")
		return
	}

	databasePool.Close()
	logging.Println("🐘 [postgres] pool closed")
}
