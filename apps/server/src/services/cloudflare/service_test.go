package cloudflare_service

import (
	"context"
	"errors"
	"testing"
)

func TestBuildDocumentObjectKeyCanonicalizesUUIDs(t *testing.T) {
	key, err := BuildDocumentObjectKey(
		"550E8400-E29B-41D4-A716-446655440000",
		"6BA7B810-9DAD-11D1-80B4-00C04FD430C8",
	)
	if err != nil {
		t.Fatalf("build document object key: %v", err)
	}

	want := "files/550e8400-e29b-41d4-a716-446655440000/6ba7b810-9dad-11d1-80b4-00c04fd430c8/content.txt"
	if key != want {
		t.Fatalf("BuildDocumentObjectKey() = %q, want %q", key, want)
	}
}

func TestBuildDocumentObjectKeyRejectsInvalidIDs(t *testing.T) {
	if _, err := BuildDocumentObjectKey("user/with/path", "document-id"); err == nil {
		t.Fatal("BuildDocumentObjectKey() should reject invalid UUIDs")
	}
}

func TestBuildUserDocumentPrefixCanonicalizesUUIDs(t *testing.T) {
	prefix, err := BuildUserDocumentPrefix("550E8400-E29B-41D4-A716-446655440000")
	if err != nil {
		t.Fatalf("BuildUserDocumentPrefix() error = %v", err)
	}

	want := "files/550e8400-e29b-41d4-a716-446655440000/"
	if prefix != want {
		t.Fatalf("BuildUserDocumentPrefix() = %q, want %q", prefix, want)
	}
}

func TestGenerateDocumentUploadURLRequiresStorage(t *testing.T) {
	service := NewWithStorage(nil)

	_, err := service.GenerateDocumentUploadURL(
		context.Background(),
		"550e8400-e29b-41d4-a716-446655440000",
		"6ba7b810-9dad-11d1-80b4-00c04fd430c8",
		"text/plain",
	)
	if !errors.Is(err, ErrStorageNotInitialized) {
		t.Fatalf("GenerateDocumentUploadURL() error = %v, want ErrStorageNotInitialized", err)
	}
}
