package logger_service

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/andrew/md-pdf-preview/server/src/config/logging"
	"github.com/andrew/md-pdf-preview/server/src/models"
	"github.com/labstack/echo/v4"
)

const (
	maxCapturedPayloadBytes = 32 * 1024
	maxBufferedLogEntries   = 100
	maxLogMessageBytes      = 4096
)

type contextKey string

const logBufferContextKey contextKey = "request-log-buffer"

const accountDeletionCompletedContextKey = "account-deletion-completed"

// MarkAccountDeletionCompleted marks only the successful cloud-cleanup
// request for privacy-preserving request-log persistence.
func MarkAccountDeletionCompleted(context echo.Context) {
	context.Set(accountDeletionCompletedContextKey, true)
}

func isAccountDeletionCompleted(context echo.Context) bool {
	completed, ok := context.Get(accountDeletionCompletedContextKey).(bool)
	return ok && completed
}

func userIDForRequestLog(context echo.Context) *string {
	if isAccountDeletionCompleted(context) {
		return nil
	}

	return userIDFromContext(context)
}

// RequestLogger captures one bounded request record around every Echo handler.
func (service *Service) RequestLogger() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if service == nil || !service.enabled {
				return next(c)
			}

			requestID := newRequestID()
			c.Response().Header().Set("X-Request-ID", requestID)

			input := captureRequestInput(c.Request())
			buffer := newLogBuffer()
			request := c.Request()
			requestContext := context.WithValue(request.Context(), logBufferContextKey, buffer)
			c.Set("logger", buffer)
			c.Set("request_id", requestID)
			c.SetRequest(request.WithContext(requestContext))

			responseWriter := c.Response().Writer
			responseCapture := newResponseCapture(responseWriter)
			c.Response().Writer = responseCapture
			startedAt := time.Now()
			err := next(c)
			c.Response().Writer = responseWriter

			status := responseStatus(c.Response().Status, err)
			durationMs := time.Since(startedAt).Milliseconds()
			outcome := models.RequestLogOutcomeSuccess
			if err != nil || status >= http.StatusBadRequest {
				outcome = models.RequestLogOutcomeError
			}

			var errorCode *string
			var errorMessage string
			if outcome == models.RequestLogOutcomeError {
				code, message := errorDetails(err, status)
				errorCode = &code
				errorMessage = message
			}

			requestLog := models.RequestLog{
				RequestID:    requestID,
				UserID:       userIDForRequestLog(c),
				Method:       request.Method,
				Endpoint:     endpointFromContext(c),
				Input:        SanitizeJSON(input),
				Output:       SanitizeJSON(captureResponseOutput(responseCapture, c.Response().Header().Get("Content-Type"))),
				Status:       status,
				Outcome:      outcome,
				IPAddress:    c.RealIP(),
				DurationMs:   durationMs,
				ErrorCode:    errorCode,
				ErrorMessage: errorMessage,
				ServiceLogs:  buffer.Messages(),
				CreatedAt:    time.Now().UTC(),
			}

			requestEmoji := "✅"
			if outcome == models.RequestLogOutcomeError {
				requestEmoji = "❌"
			}
			logging.Printf(
				"%s [http] %s %s status=%d duration_ms=%d request_id=%s",
				requestEmoji,
				request.Method,
				endpointFromContext(c),
				status,
				durationMs,
				requestID,
			)

			service.Dispatch(requestLog)
			return err
		}
	}
}

// Log records a bounded service message in the current request context.
func Log(ctx context.Context, level string, message string, args ...any) {
	buffer, ok := ctx.Value(logBufferContextKey).(*LogBuffer)
	formattedMessage := SanitizeText(fmt.Sprintf(message, args...))
	logging.Printf("[logger] [%s] %s", strings.TrimSpace(level), formattedMessage)

	if ok && buffer != nil {
		buffer.Add(level, formattedMessage)
	}
}

type LogBuffer struct {
	mu      sync.Mutex
	entries []models.LoggerMessage
}

func newLogBuffer() *LogBuffer {
	return &LogBuffer{entries: make([]models.LoggerMessage, 0, maxBufferedLogEntries)}
}

func (buffer *LogBuffer) Add(level string, message string) {
	if buffer == nil {
		return
	}

	message = SanitizeText(message)
	if len(message) > maxLogMessageBytes {
		message = message[:maxLogMessageBytes] + "...[truncated]"
	}

	buffer.mu.Lock()
	defer buffer.mu.Unlock()
	if len(buffer.entries) >= maxBufferedLogEntries {
		return
	}

	buffer.entries = append(buffer.entries, models.LoggerMessage{
		Timestamp: time.Now().UTC(),
		Level:     level,
		Message:   message,
	})
}

func (buffer *LogBuffer) Messages() []models.LoggerMessage {
	if buffer == nil {
		return nil
	}

	buffer.mu.Lock()
	defer buffer.mu.Unlock()
	result := make([]models.LoggerMessage, len(buffer.entries))
	copy(result, buffer.entries)
	return result
}

type responseCapture struct {
	writer http.ResponseWriter
	body   bytes.Buffer
}

func newResponseCapture(writer http.ResponseWriter) *responseCapture {
	return &responseCapture{writer: writer}
}

func (capture *responseCapture) Header() http.Header {
	return capture.writer.Header()
}

func (capture *responseCapture) WriteHeader(statusCode int) {
	capture.writer.WriteHeader(statusCode)
}

func (capture *responseCapture) Write(payload []byte) (int, error) {
	if capture.body.Len() < maxCapturedPayloadBytes {
		remaining := maxCapturedPayloadBytes - capture.body.Len()
		if len(payload) > remaining {
			_, _ = capture.body.Write(payload[:remaining])
		} else {
			_, _ = capture.body.Write(payload)
		}
	}

	return capture.writer.Write(payload)
}

func (capture *responseCapture) Flush() {
	if flusher, ok := capture.writer.(http.Flusher); ok {
		flusher.Flush()
	}
}

func (capture *responseCapture) Unwrap() http.ResponseWriter {
	return capture.writer
}

func captureRequestInput(request *http.Request) json.RawMessage {
	result := make(map[string]any)
	if query := request.URL.Query(); len(query) > 0 {
		result["query"] = query
	}

	contentType := request.Header.Get("Content-Type")
	if request.Body != nil && request.ContentLength >= 0 && request.ContentLength <= maxCapturedPayloadBytes {
		body, err := io.ReadAll(request.Body)
		if err == nil {
			request.Body = io.NopCloser(bytes.NewReader(body))
			if len(body) > 0 && strings.Contains(strings.ToLower(contentType), "json") {
				var decoded any
				if json.Unmarshal(body, &decoded) == nil {
					result["payload"] = decoded
				} else {
					result["payload_omitted"] = true
				}
			} else if len(body) > 0 {
				result["body_omitted"] = true
				result["content_type"] = contentType
				result["body_bytes"] = len(body)
			}
		}
	} else if request.ContentLength != 0 {
		result["body_omitted"] = true
		result["content_type"] = contentType
		result["body_bytes"] = request.ContentLength
	}

	if len(result) == 0 {
		return nil
	}

	encoded, err := json.Marshal(result)
	if err != nil {
		return nil
	}

	return encoded
}

func captureResponseOutput(capture *responseCapture, contentType string) json.RawMessage {
	if capture == nil || capture.body.Len() == 0 {
		return nil
	}
	if !strings.Contains(strings.ToLower(contentType), "json") {
		return nil
	}

	return capture.body.Bytes()
}

func responseStatus(current int, err error) int {
	if current >= 100 && current <= 599 {
		if err != nil && current < http.StatusBadRequest {
			return errorStatus(err)
		}
		return current
	}
	if err != nil {
		return errorStatus(err)
	}

	return http.StatusOK
}

func errorStatus(err error) int {
	if httpError, ok := err.(*echo.HTTPError); ok {
		if status := httpError.Code; status >= 100 && status <= 599 {
			return status
		}
	}

	return http.StatusInternalServerError
}

func errorDetails(err error, status int) (string, string) {
	if err == nil {
		return fmt.Sprintf("HTTP_%d", status), fmt.Sprintf("request returned HTTP %d", status)
	}

	if httpError, ok := err.(*echo.HTTPError); ok {
		message := fmt.Sprint(httpError.Message)
		return fmt.Sprintf("HTTP_%d", httpError.Code), message
	}

	return fmt.Sprintf("HTTP_%d", status), err.Error()
}

func endpointFromContext(context echo.Context) string {
	if path := strings.TrimSpace(context.Path()); path != "" {
		return path
	}

	return context.Request().URL.Path
}

func userIDFromContext(context echo.Context) *string {
	value := context.Get("user_id")
	if userID, ok := value.(string); ok && strings.TrimSpace(userID) != "" {
		userID = strings.TrimSpace(userID)
		return &userID
	}
	if userID, ok := value.(*string); ok && userID != nil && strings.TrimSpace(*userID) != "" {
		trimmedUserID := strings.TrimSpace(*userID)
		return &trimmedUserID
	}

	// Hono injects the verified Better Auth identity through this internal header.
	if userID := strings.TrimSpace(context.Request().Header.Get("X-User-Id")); userID != "" {
		return &userID
	}

	return nil
}

func newRequestID() string {
	var value [16]byte
	if _, err := rand.Read(value[:]); err != nil {
		value = [16]byte{}
		now := time.Now().UnixNano()
		for index := range value {
			value[index] = byte(now >> (index % 8 * 8))
		}
	}

	value[6] = (value[6] & 0x0f) | 0x40
	value[8] = (value[8] & 0x3f) | 0x80
	return fmt.Sprintf(
		"%08x-%04x-%04x-%04x-%012x",
		value[0:4],
		value[4:6],
		value[6:8],
		value[8:10],
		value[10:16],
	)
}
