package environment

import (
	"errors"
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

func Load(path string) error {
	if err := godotenv.Load(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("load environment file: %w", err)
	}

	return nil
}
