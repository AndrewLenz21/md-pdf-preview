package postgres

import (
	"fmt"
	"os"
	"regexp"
	"strings"
)

const DefaultSchema = "your_schema"

var schemaIdentifierPattern = regexp.MustCompile(`^[a-z_][a-z0-9_]*$`)

type Config struct {
	DatabaseURL    string
	DatabaseSchema string
}

func LoadConfig() (Config, error) {
	databaseURL := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if databaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL must be configured")
	}

	databaseSchema := strings.TrimSpace(os.Getenv("DB_SCHEMA"))
	if databaseSchema == "" {
		databaseSchema = DefaultSchema
	}

	if !schemaIdentifierPattern.MatchString(databaseSchema) {
		return Config{}, fmt.Errorf("DB_SCHEMA must be a valid PostgreSQL schema identifier")
	}

	return Config{
		DatabaseURL:    databaseURL,
		DatabaseSchema: databaseSchema,
	}, nil
}
