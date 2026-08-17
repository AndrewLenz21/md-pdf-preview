package server

import "testing"

func TestAddress(t *testing.T) {
	t.Setenv("SERVER_PORT", "9090")

	if actual := Address(); actual != ":9090" {
		t.Fatalf("expected :9090, got %s", actual)
	}
}

func TestAddressDefaultsTo8080(t *testing.T) {
	t.Setenv("SERVER_PORT", "")

	if actual := Address(); actual != ":8080" {
		t.Fatalf("expected :8080, got %s", actual)
	}
}
