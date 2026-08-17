package environment

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoad(t *testing.T) {
	const environmentVariable = "SERVER_PORT"
	previousValue, wasSet := os.LookupEnv(environmentVariable)
	t.Cleanup(func() {
		if wasSet {
			_ = os.Setenv(environmentVariable, previousValue)
			return
		}

		_ = os.Unsetenv(environmentVariable)
	})
	_ = os.Unsetenv(environmentVariable)

	environmentFile := filepath.Join(t.TempDir(), ".env")
	if err := os.WriteFile(environmentFile, []byte("SERVER_PORT=9090\n"), 0o600); err != nil {
		t.Fatal(err)
	}

	t.Chdir(filepath.Dir(environmentFile))
	if err := Load(".env"); err != nil {
		t.Fatal(err)
	}

	if actual := os.Getenv(environmentVariable); actual != "9090" {
		t.Fatalf("expected %s to be loaded, got %s", environmentVariable, actual)
	}
}
