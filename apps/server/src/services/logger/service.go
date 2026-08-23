package logger_service

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/andrew/md-pdf-preview/server/src/config/logging"
	"github.com/andrew/md-pdf-preview/server/src/config/postgres"
	"github.com/andrew/md-pdf-preview/server/src/models"
	request_log_repository "github.com/andrew/md-pdf-preview/server/src/repositories/request_logs"
	cloudflare_service "github.com/andrew/md-pdf-preview/server/src/services/cloudflare"
)

const (
	defaultLoggerQueueSize = 256
	defaultLoggerWorkers   = 2
)

type Service struct {
	enabled     bool
	queue       chan models.RequestLog
	workers     int
	timeout     time.Duration
	errorLogger *ErrorLoggerService

	mu      sync.Mutex
	started bool
	closed  bool
	wait    sync.WaitGroup
}

func New() *Service {
	return NewWithDependencies(
		loggerEnabled(),
		cloudflare_service.New(),
		loggerQueueSize(),
		loggerWorkers(),
		loggerTimeout(),
	)
}

func NewWithDependencies(
	enabled bool,
	storage ErrorLogStorage,
	queueSize int,
	workers int,
	timeout time.Duration,
) *Service {
	if queueSize <= 0 {
		queueSize = defaultLoggerQueueSize
	}
	if workers <= 0 {
		workers = defaultLoggerWorkers
	}
	if timeout <= 0 {
		timeout = 5 * time.Second
	}

	return &Service{
		enabled:     enabled,
		queue:       make(chan models.RequestLog, queueSize),
		workers:     workers,
		timeout:     timeout,
		errorLogger: NewErrorLoggerService(storage, timeout),
	}
}

func (service *Service) Start() {
	if service == nil || !service.enabled {
		return
	}

	service.mu.Lock()
	defer service.mu.Unlock()
	if service.started || service.closed {
		return
	}

	service.started = true
	for index := 0; index < service.workers; index++ {
		service.wait.Add(1)
		go service.worker()
	}
	logging.Printf("✅ [logger] started workers=%d queue_size=%d", service.workers, cap(service.queue))
}

// Dispatch never blocks the request indefinitely when the queue is full.
func (service *Service) Dispatch(requestLog models.RequestLog) {
	if service == nil || !service.enabled {
		return
	}

	service.mu.Lock()
	defer service.mu.Unlock()
	if service.closed || !service.started {
		return
	}

	select {
	case service.queue <- requestLog:
	default:
		logging.Printf("⚠️ [logger] queue full; dropping request_id=%s", requestLog.RequestID)
	}
}

func (service *Service) Stop(ctx context.Context) error {
	if service == nil || !service.enabled {
		return nil
	}

	service.mu.Lock()
	if !service.started || service.closed {
		service.mu.Unlock()
		return nil
	}
	service.closed = true
	close(service.queue)
	service.mu.Unlock()

	done := make(chan struct{})
	go func() {
		service.wait.Wait()
		close(done)
	}()

	select {
	case <-done:
		logging.Println("🛑 [logger] workers stopped")
		return nil
	case <-ctx.Done():
		return fmt.Errorf("stop logger workers: %w", ctx.Err())
	}
}

func (service *Service) worker() {
	defer service.wait.Done()
	for requestLog := range service.queue {
		service.process(requestLog)
	}
}

func (service *Service) process(requestLog models.RequestLog) {
	processContext, cancel := context.WithTimeout(context.Background(), service.timeout)
	defer cancel()

	pool, ok := postgres.GetPool()
	if !ok {
		logging.Printf("⚠️ [logger][DB] PostgreSQL unavailable; dropped request_id=%s", requestLog.RequestID)
		return
	}

	schema := postgres.DefaultSchema
	if config, err := postgres.LoadConfig(); err == nil {
		schema = config.DatabaseSchema
	}

	repository := request_log_repository.NewRequestLogRepository(pool, schema)
	archivedLog, archiveErr := service.errorLogger.Log(processContext, requestLog)
	if archiveErr == nil {
		requestLog.ConsoleLogsR2Key = pointerToString(archivedLog.Key)
		requestLog.ConsoleLogsSizeBytes = &archivedLog.CompressedSize
		requestLog.ConsoleLogsSHA256 = &archivedLog.CompressedSHA256
	} else {
		logging.Printf("🚨 [logger][R2] archive failed request_id=%s: %v", requestLog.RequestID, archiveErr)
	}

	if err := repository.Create(processContext, requestLog); err != nil {
		logging.Printf("❌ [logger][DB] create request log failed request_id=%s: %v", requestLog.RequestID, err)
		return
	}

	if requestLog.Outcome != models.RequestLogOutcomeError {
		return
	}

	if archiveErr != nil {
		return
	}

	if err := repository.UpdateLoggerError(processContext, requestLog.RequestID, archivedLog.JSON); err != nil {
		logging.Printf("❌ [logger][DB] persist error document failed request_id=%s: %v", requestLog.RequestID, err)
	}
}

func pointerToString(value string) *string {
	return &value
}

func loggerEnabled() bool {
	value := os.Getenv("ERROR_LOGGING_ENABLED")
	if value == "" {
		return true
	}

	enabled, err := strconv.ParseBool(value)
	return err != nil || enabled
}

func loggerQueueSize() int {
	return positiveEnvInt("ERROR_LOGGING_QUEUE_SIZE", defaultLoggerQueueSize)
}

func loggerWorkers() int {
	return positiveEnvInt("ERROR_LOGGING_WORKERS", defaultLoggerWorkers)
}

func positiveEnvInt(key string, fallback int) int {
	value, err := strconv.Atoi(os.Getenv(key))
	if err != nil || value <= 0 {
		return fallback
	}

	return value
}

func loggerTimeout() time.Duration {
	value := os.Getenv("ERROR_LOGGING_TIMEOUT")
	if value == "" {
		return 5 * time.Second
	}

	timeout, err := time.ParseDuration(value)
	if err != nil || timeout <= 0 {
		return 5 * time.Second
	}

	return timeout
}
