package workspace_service

import (
	"context"
	"errors"
	"testing"

	"github.com/andrew/md-pdf-preview/server/src/models"
)

func TestCreateRejectsInvalidWorkspaceItem(t *testing.T) {
	service := NewWithDependencies(context.Background(), nil, "app2", nil)

	_, err := service.Create("550e8400-e29b-41d4-a716-446655440000", models.CreateWorkspaceItemParams{
		Name: "   ",
		Type: models.WorkspaceItemTypeDocument,
	})
	if err == nil {
		t.Fatal("Create() should reject an empty workspace item name")
	}
}

func TestListRequiresRepository(t *testing.T) {
	service := NewWithDependencies(context.Background(), nil, "app2", nil)

	_, err := service.List("550e8400-e29b-41d4-a716-446655440000")
	if !errors.Is(err, ErrWorkspaceDatabaseUnavailable) {
		t.Fatalf("List() error = %v, want ErrWorkspaceDatabaseUnavailable", err)
	}
}
