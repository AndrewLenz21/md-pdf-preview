package logger_service

import (
	"bytes"
	"compress/gzip"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/andrew/md-pdf-preview/server/src/models"
)

const (
	defaultErrorLogTimeout = 5 * time.Second
	loggerErrorSchema      = 1
)

var requestIDPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{1,128}$`)

type ErrorLogStorage interface {
	PutLoggerObject(context.Context, string, []byte) error
}

type ArchivedRequestLog struct {
	Key              string
	JSON             json.RawMessage
	Compressed       []byte
	CompressedSize   int64
	CompressedSHA256 string
}

type ErrorLoggerService struct {
	storage ErrorLogStorage
	timeout time.Duration
}

func NewErrorLoggerService(storage ErrorLogStorage, timeout time.Duration) *ErrorLoggerService {
	if timeout <= 0 {
		timeout = defaultErrorLogTimeout
	}

	return &ErrorLoggerService{
		storage: storage,
		timeout: timeout,
	}
}

// Log writes the complete request document to R2 for both successful and failed requests.
func (service *ErrorLoggerService) Log(
	ctx context.Context,
	requestLog models.RequestLog,
) (ArchivedRequestLog, error) {
	if service == nil || service.storage == nil {
		return ArchivedRequestLog{}, errors.New("error logger storage is not initialized")
	}

	createdAt := requestLog.CreatedAt
	if createdAt.IsZero() {
		createdAt = time.Now().UTC()
	}

	r2Key, err := BuildLoggerKey(requestLog.RequestID, createdAt)
	if err != nil {
		return ArchivedRequestLog{}, err
	}

	document := models.RequestLogDocument{
		SchemaVersion: loggerErrorSchema,
		RequestID:     requestLog.RequestID,
		UserID:        requestLog.UserID,
		Operation:     requestLog.Endpoint,
		Endpoint:      requestLog.Endpoint,
		Timestamp:     createdAt.UTC(),
		DurationMs:    requestLog.DurationMs,
		Status:        requestLog.Outcome,
		Input:         SanitizeJSON(requestLog.Input),
		Output:        SanitizeJSON(requestLog.Output),
		Logs:          SanitizeLogs(requestLog.ServiceLogs),
		R2Key:         r2Key,
	}
	if requestLog.Outcome == models.RequestLogOutcomeError {
		document.Error = &models.LoggerError{
			Code:    errorCode(requestLog.ErrorCode),
			Message: SanitizeText(requestLog.ErrorMessage),
		}
	}
	if document.Logs == nil {
		document.Logs = []models.LoggerMessage{}
	}

	jsonBytes, err := json.Marshal(document)
	if err != nil {
		return ArchivedRequestLog{}, fmt.Errorf("marshal error logger document: %w", err)
	}

	compressed, err := gzipBytes(jsonBytes)
	if err != nil {
		return ArchivedRequestLog{}, fmt.Errorf("compress error logger document: %w", err)
	}

	loggingContext, cancel := context.WithTimeout(ctx, service.timeout)
	defer cancel()

	if err := service.storage.PutLoggerObject(loggingContext, r2Key, compressed); err != nil {
		return ArchivedRequestLog{}, fmt.Errorf(
			"store request logger document in R2 (key=%q): %w",
			r2Key,
			err,
		)
	}

	return ArchivedRequestLog{
		Key:              r2Key,
		JSON:             json.RawMessage(jsonBytes),
		Compressed:       compressed,
		CompressedSize:   int64(len(compressed)),
		CompressedSHA256: sha256Hex(compressed),
	}, nil
}

func BuildLoggerKey(requestID string, timestamp time.Time) (string, error) {
	requestID = strings.TrimSpace(requestID)
	if !requestIDPattern.MatchString(requestID) {
		return "", errors.New("request ID contains invalid characters")
	}

	timestamp = timestamp.UTC()
	return fmt.Sprintf(
		"logs/%04d/%02d/%02d/%s.json.gz",
		timestamp.Year(),
		timestamp.Month(),
		timestamp.Day(),
		requestID,
	), nil
}

func gzipBytes(value []byte) ([]byte, error) {
	var buffer bytes.Buffer
	writer := gzip.NewWriter(&buffer)
	if _, err := writer.Write(value); err != nil {
		_ = writer.Close()
		return nil, err
	}
	if err := writer.Close(); err != nil {
		return nil, err
	}

	return buffer.Bytes(), nil
}

func sha256Hex(value []byte) string {
	digest := sha256.Sum256(value)
	return hex.EncodeToString(digest[:])
}

func errorCode(value *string) string {
	if value == nil || strings.TrimSpace(*value) == "" {
		return "REQUEST_FAILED"
	}

	return SanitizeText(*value)
}

func SanitizeLogs(logs []models.LoggerMessage) []models.LoggerMessage {
	if len(logs) == 0 {
		return []models.LoggerMessage{}
	}

	result := make([]models.LoggerMessage, 0, len(logs))
	for _, entry := range logs {
		entry.Message = SanitizeText(entry.Message)
		result = append(result, entry)
	}

	return result
}

func SanitizeText(value string) string {
	if strings.Contains(strings.ToLower(value), "x-amz-") {
		return "[REDACTED_PRESIGNED_URL]"
	}

	redacted := sensitiveValuePattern.ReplaceAllString(value, `$1=[REDACTED]`)
	return strings.TrimSpace(redacted)
}

func SanitizeJSON(value json.RawMessage) json.RawMessage {
	if len(value) == 0 {
		return nil
	}

	var decoded any
	if err := json.Unmarshal(value, &decoded); err != nil {
		return json.RawMessage(`{"omitted":true,"reason":"invalid_json"}`)
	}

	sanitized := sanitizeJSONValue(decoded)
	result, err := json.Marshal(sanitized)
	if err != nil {
		return json.RawMessage(`{"omitted":true,"reason":"serialization_error"}`)
	}

	return result
}

var sensitiveValuePattern = regexp.MustCompile(`(?i)(authorization|cookie|set-cookie|password|token|secret|api[_-]?key|access[_-]?token|refresh[_-]?token)\s*[:=]\s*("[^"]*"|'[^']*'|\S+)`)

func sanitizeJSONValue(value any) any {
	switch typed := value.(type) {
	case map[string]any:
		result := make(map[string]any, len(typed))
		for key, item := range typed {
			if sensitiveJSONKey(key) {
				result[key] = "[REDACTED]"
				continue
			}
			result[key] = sanitizeJSONValue(item)
		}
		return result
	case []any:
		result := make([]any, len(typed))
		for index, item := range typed {
			result[index] = sanitizeJSONValue(item)
		}
		return result
	case string:
		return SanitizeText(typed)
	default:
		return value
	}
}

func sensitiveJSONKey(key string) bool {
	normalized := strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(key, "_", ""), "-", ""))
	if normalized == "content" || normalized == "markdown" || normalized == "base64" || normalized == "rawbody" {
		return true
	}

	for _, fragment := range []string{
		"authorization",
		"cookie",
		"password",
		"token",
		"secret",
		"apikey",
		"credential",
		"refresh",
	} {
		if strings.Contains(normalized, fragment) {
			return true
		}
	}

	return false
}
