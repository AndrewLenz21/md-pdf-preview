package models

import (
	"encoding/json"
	"time"
)

const (
	RequestLogOutcomeSuccess = "success"
	RequestLogOutcomeError   = "error"
)

type RequestLog struct {
	RequestID            string
	OperationID          *string
	UserID               *string
	Method               string
	Endpoint             string
	Input                json.RawMessage
	Output               json.RawMessage
	Status               int
	Outcome              string
	IPAddress            string
	DurationMs           int64
	ErrorCode            *string
	ErrorMessage         string
	ServiceLogs          []LoggerMessage
	ConsoleLogsR2Key     *string
	ConsoleLogsSizeBytes *int64
	ConsoleLogsSHA256    *string
	CreatedAt            time.Time
}
