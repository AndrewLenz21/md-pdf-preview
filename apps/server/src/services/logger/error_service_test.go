package logger_service

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/json"
	"io"
	"testing"
	"time"

	"github.com/andrew/md-pdf-preview/server/src/models"
)

type memoryErrorStorage struct {
	key  string
	body []byte
	err  error
}

func (storage *memoryErrorStorage) PutLoggerObject(_ context.Context, key string, body []byte) error {
	if storage.err != nil {
		return storage.err
	}

	storage.key = key
	storage.body = append([]byte(nil), body...)
	return nil
}

func TestBuildLoggerKeyUsesUTCAndRejectsPathTraversal(t *testing.T) {
	timestamp := time.Date(2026, time.August, 23, 1, 30, 0, 0, time.FixedZone("test", 2*60*60))
	key, err := BuildLoggerKey("req_01J6XYZ", timestamp)
	if err != nil {
		t.Fatalf("BuildLoggerErrorKey() error = %v", err)
	}

	if key != "logs/2026/08/22/req_01J6XYZ.json.gz" {
		t.Fatalf("unexpected logger key: %s", key)
	}

	if _, err := BuildLoggerKey("../request", timestamp); err == nil {
		t.Fatal("BuildLoggerKey() should reject path traversal")
	}
}

func TestErrorLoggerServiceUploadsGzipDocument(t *testing.T) {
	storage := &memoryErrorStorage{}
	service := NewErrorLoggerService(storage, time.Second)
	errorCode := "PDF_RENDER_FAILED"

	requestLog := models.RequestLog{
		RequestID:    "req_01J6XYZ",
		UserID:       stringPointer("user-123"),
		Endpoint:     "/documents/:id/render",
		Input:        json.RawMessage(`{"documentId":"doc-123"}`),
		Output:       json.RawMessage(`{"error":"render failed"}`),
		Outcome:      models.RequestLogOutcomeError,
		Status:       500,
		DurationMs:   812,
		ErrorCode:    &errorCode,
		ErrorMessage: "render failed",
		ServiceLogs: []models.LoggerMessage{{
			Level:   "error",
			Message: "render failed",
		}},
		CreatedAt: time.Date(2026, time.August, 22, 21, 25, 30, 0, time.UTC),
	}

	archived, err := service.Log(context.Background(), requestLog)
	if err != nil {
		t.Fatalf("ErrorLoggerService.Log() error = %v", err)
	}

	if storage.key != "logs/2026/08/22/req_01J6XYZ.json.gz" {
		t.Fatalf("unexpected R2 key: %s", storage.key)
	}

	reader, err := gzip.NewReader(bytes.NewReader(storage.body))
	if err != nil {
		t.Fatalf("open gzip document: %v", err)
	}
	decompressed, err := io.ReadAll(reader)
	if err != nil {
		t.Fatalf("read gzip document: %v", err)
	}
	if err := reader.Close(); err != nil {
		t.Fatalf("close gzip document: %v", err)
	}

	var document models.RequestLogDocument
	if err := json.Unmarshal(decompressed, &document); err != nil {
		t.Fatalf("decode error document: %v", err)
	}
	if document.R2Key != storage.key {
		t.Fatalf("error document R2 key = %s, want %s", document.R2Key, storage.key)
	}

	var persisted models.RequestLogDocument
	if err := json.Unmarshal(archived.JSON, &persisted); err != nil {
		t.Fatalf("decode persisted error document: %v", err)
	}
	if persisted.Error.Code != errorCode {
		t.Fatalf("persisted error code = %s, want %s", persisted.Error.Code, errorCode)
	}
}

func TestErrorLoggerServiceReturnsR2Failure(t *testing.T) {
	storage := &memoryErrorStorage{err: context.Canceled}
	service := NewErrorLoggerService(storage, time.Second)

	requestLog := models.RequestLog{
		RequestID:    "req_01J6XYZ",
		Endpoint:     "/documents/:id/render",
		Outcome:      models.RequestLogOutcomeError,
		Status:       500,
		CreatedAt:    time.Now().UTC(),
		ErrorMessage: "render failed",
	}

	if _, err := service.Log(context.Background(), requestLog); err == nil {
		t.Fatal("ErrorLoggerService.Log() should return the R2 error")
	}
}

func TestErrorLoggerServiceArchivesSuccessfulRequests(t *testing.T) {
	storage := &memoryErrorStorage{}
	service := NewErrorLoggerService(storage, time.Second)

	requestLog := models.RequestLog{
		RequestID: "req_01J6XYZ",
		Endpoint:  "/health",
		Outcome:   models.RequestLogOutcomeSuccess,
		Status:    200,
	}

	if _, err := service.Log(context.Background(), requestLog); err != nil {
		t.Fatalf("successful request should not invoke error logger: %v", err)
	}
	if storage.key == "" {
		t.Fatal("successful request should still write its archive to R2")
	}
	reader, err := gzip.NewReader(bytes.NewReader(storage.body))
	if err != nil {
		t.Fatalf("open successful gzip document: %v", err)
	}
	decompressed, err := io.ReadAll(reader)
	if err != nil {
		t.Fatalf("read successful gzip document: %v", err)
	}
	_ = reader.Close()

	var document models.RequestLogDocument
	if err := json.Unmarshal(decompressed, &document); err != nil {
		t.Fatalf("decode successful request document: %v", err)
	}
	if document.Status != models.RequestLogOutcomeSuccess {
		t.Fatalf("successful document status = %s, want %s", document.Status, models.RequestLogOutcomeSuccess)
	}
	if document.Error != nil {
		t.Fatal("successful request document should not contain an error")
	}
}

func TestSanitizeJSONRedactsSensitiveAndDocumentFields(t *testing.T) {
	input := json.RawMessage(`{"token":"secret","documentId":"doc-123","content":"full markdown"}`)
	sanitized := SanitizeJSON(input)

	var decoded map[string]any
	if err := json.Unmarshal(sanitized, &decoded); err != nil {
		t.Fatalf("decode sanitized JSON: %v", err)
	}
	if decoded["token"] != "[REDACTED]" {
		t.Fatalf("token was not redacted: %#v", decoded["token"])
	}
	if decoded["content"] != "[REDACTED]" {
		t.Fatalf("content was not redacted: %#v", decoded["content"])
	}
}

func stringPointer(value string) *string {
	return &value
}
