package postgres

import (
	"context"
	"fmt"
	"sync"
	"time"

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
		fmt.Printf("❌ [postgres] startup failed: %v\n", err)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	fmt.Printf("🐘 [postgres] creating connection pool for schema %s\n", databaseConfig.DatabaseSchema)

	poolConfig, err := pgxpool.ParseConfig(databaseConfig.DatabaseURL)
	if err != nil {
		fmt.Printf("❌ [postgres] startup failed: parse database configuration: %v\n", err)
		return
	}

	poolConfig.ConnConfig.RuntimeParams["search_path"] = databaseConfig.DatabaseSchema
	poolConfig.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeCacheDescribe

	databasePool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		fmt.Printf("❌ [postgres] startup failed: open database pool: %v\n", err)
		return
	}

	if err := databasePool.Ping(ctx); err != nil {
		databasePool.Close()
		fmt.Printf("❌ [postgres] startup failed: database ping failed: %v\n", err)
		return
	}

	if err := migrations.BootstrapSchema(ctx, databasePool, databaseConfig.DatabaseSchema); err != nil {
		databasePool.Close()
		fmt.Printf("❌ [postgres] startup failed: database bootstrap failed: %v\n", err)
		return
	}

	poolMutex.Lock()
	if poolClosed {
		poolMutex.Unlock()
		databasePool.Close()
		fmt.Println("⚠️ [postgres] startup cancelled during shutdown")
		return
	}

	pool = databasePool
	poolMutex.Unlock()
	fmt.Printf("✅ [postgres] pool connected; schema %s and Better Auth tables are ready\n", databaseConfig.DatabaseSchema)
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
		fmt.Println("⚠️ [postgres] pool was not initialized")
		return
	}

	databasePool.Close()
	fmt.Println("🐘 [postgres] pool closed")
}
