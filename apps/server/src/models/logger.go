package models

import (
	"encoding/json"
	"time"
)

type LoggerMessage struct {
	Timestamp time.Time `json:"timestamp"`
	Level     string    `json:"level"`
	Message   string    `json:"message"`
}

type LoggerError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type RequestLogDocument struct {
	SchemaVersion int             `json:"schema_version"`
	RequestID     string          `json:"request_id"`
	UserID        *string         `json:"user_id,omitempty"`
	Operation     string          `json:"operation"`
	Endpoint      string          `json:"endpoint"`
	Timestamp     time.Time       `json:"timestamp"`
	DurationMs    int64           `json:"duration_ms"`
	Status        string          `json:"status"`
	Input         json.RawMessage `json:"input,omitempty"`
	Output        json.RawMessage `json:"output,omitempty"`
	Error         *LoggerError    `json:"error,omitempty"`
	Logs          []LoggerMessage `json:"logs"`
	R2Key         string          `json:"r2_key"`
}
