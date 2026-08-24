package workspace_service

import (
	"context"
	"errors"
	"reflect"
	"testing"

	"github.com/andrew/md-pdf-preview/server/src/models"
	cloudflare_service "github.com/andrew/md-pdf-preview/server/src/services/cloudflare"
)

type fakeWorkspaceRepository struct {
	item            models.WorkspaceItem
	objectKeys      []string
	deletedCount    int
	events          *[]string
	completedParams models.CompleteDocumentUploadParams
	lockReleased    bool
}

func (repository *fakeWorkspaceRepository) Create(context.Context, string, models.CreateWorkspaceItemParams) (models.WorkspaceItem, error) {
	return repository.item, nil
}

func (repository *fakeWorkspaceRepository) List(context.Context, string) ([]models.WorkspaceItem, error) {
	return []models.WorkspaceItem{repository.item}, nil
}

func (repository *fakeWorkspaceRepository) Get(context.Context, string, string) (models.WorkspaceItem, error) {
	return repository.item, nil
}

func (repository *fakeWorkspaceRepository) Update(context.Context, string, models.UpdateWorkspaceItemParams) (models.WorkspaceItem, error) {
	return repository.item, nil
}

func (repository *fakeWorkspaceRepository) CompleteDocumentUpload(_ context.Context, _ string, params models.CompleteDocumentUploadParams) (models.WorkspaceItem, error) {
	repository.completedParams = params
	return repository.item, nil
}

func (repository *fakeWorkspaceRepository) CollectSubtreeR2ObjectKeys(context.Context, string, string) ([]string, error) {
	if repository.events != nil {
		*repository.events = append(*repository.events, "collect")
	}
	return repository.objectKeys, nil
}

func (repository *fakeWorkspaceRepository) CollectR2ObjectKeys(context.Context, string) ([]string, error) {
	if repository.events != nil {
		*repository.events = append(*repository.events, "collect-account")
	}
	return repository.objectKeys, nil
}

func (repository *fakeWorkspaceRepository) AcquireDeletionLock(context.Context, string) (bool, error) {
	return true, nil
}

func (repository *fakeWorkspaceRepository) ReleaseDeletionLock(context.Context, string) error {
	repository.lockReleased = true
	return nil
}

func (repository *fakeWorkspaceRepository) IsDeletionLocked(context.Context, string) (bool, error) {
	return false, nil
}

func (repository *fakeWorkspaceRepository) Delete(context.Context, string, string) (int, error) {
	if repository.events != nil {
		*repository.events = append(*repository.events, "database-delete")
	}
	return repository.deletedCount, nil
}

type fakeWorkspaceCloudStorage struct {
	events       *[]string
	deleteErr    error
	deletedKey   []string
	listedKeys   []string
	listSequence [][]string
	listCalls    int
}

func (storage *fakeWorkspaceCloudStorage) GenerateDocumentUploadURL(context.Context, string, string, string) (cloudflare_service.PresignedDocumentURL, error) {
	return cloudflare_service.PresignedDocumentURL{}, nil
}

func (storage *fakeWorkspaceCloudStorage) GenerateDocumentDownloadURL(context.Context, string, string) (cloudflare_service.PresignedDocumentURL, error) {
	return cloudflare_service.PresignedDocumentURL{}, nil
}

func (storage *fakeWorkspaceCloudStorage) DeleteObjects(_ context.Context, keys []string) error {
	if storage.events != nil {
		*storage.events = append(*storage.events, "r2-delete")
	}
	storage.deletedKey = append([]string(nil), keys...)
	if storage.deleteErr == nil {
		storage.listedKeys = nil
	}
	return storage.deleteErr
}

func (storage *fakeWorkspaceCloudStorage) ListUserDocumentObjectKeys(context.Context, string) ([]string, error) {
	if storage.listCalls < len(storage.listSequence) {
		keys := storage.listSequence[storage.listCalls]
		storage.listCalls++
		return keys, nil
	}
	return storage.listedKeys, nil
}

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

func TestDeleteRemovesR2ObjectsBeforeDatabaseRows(t *testing.T) {
	events := make([]string, 0, 3)
	repository := &fakeWorkspaceRepository{
		objectKeys:   []string{"files/user/document/content.txt"},
		deletedCount: 1,
		events:       &events,
	}
	storage := &fakeWorkspaceCloudStorage{events: &events}
	service := &Service{
		ctx:   context.Background(),
		repo:  repository,
		cloud: storage,
	}

	deletedCount, err := service.Delete("user", "item")
	if err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if deletedCount != 1 {
		t.Fatalf("Delete() count = %d, want 1", deletedCount)
	}
	if want := []string{"collect", "r2-delete", "database-delete"}; !reflect.DeepEqual(events, want) {
		t.Fatalf("Delete() events = %#v, want %#v", events, want)
	}
	if !reflect.DeepEqual(storage.deletedKey, repository.objectKeys) {
		t.Fatalf("deleted keys = %#v, want %#v", storage.deletedKey, repository.objectKeys)
	}
}

func TestDeleteDoesNotRequireR2WhenSubtreeHasNoObjects(t *testing.T) {
	repository := &fakeWorkspaceRepository{deletedCount: 1}
	service := &Service{ctx: context.Background(), repo: repository}

	deletedCount, err := service.Delete("user", "item")
	if err != nil {
		t.Fatalf("Delete() error = %v", err)
	}
	if deletedCount != 1 {
		t.Fatalf("Delete() count = %d, want 1", deletedCount)
	}
}

func TestDeleteDoesNotDeleteDatabaseRowsWhenR2DeletionFails(t *testing.T) {
	events := make([]string, 0, 3)
	repository := &fakeWorkspaceRepository{
		objectKeys: []string{"files/user/document/content.txt"},
		events:     &events,
	}
	storage := &fakeWorkspaceCloudStorage{
		events:    &events,
		deleteErr: errors.New("R2 unavailable"),
	}
	service := &Service{ctx: context.Background(), repo: repository, cloud: storage}

	if _, err := service.Delete("user", "item"); err == nil {
		t.Fatal("Delete() should fail when R2 deletion fails")
	}
	if want := []string{"collect", "r2-delete"}; !reflect.DeepEqual(events, want) {
		t.Fatalf("Delete() events = %#v, want %#v", events, want)
	}
}

func TestDeleteCloudDataUsesPostgresAndR2Inventory(t *testing.T) {
	const userID = "550e8400-e29b-41d4-a716-446655440000"
	repository := &fakeWorkspaceRepository{
		objectKeys: []string{
			"files/550e8400-e29b-41d4-a716-446655440000/document-1/content.txt",
		},
	}
	storage := &fakeWorkspaceCloudStorage{
		listSequence: [][]string{
			{
				"files/550e8400-e29b-41d4-a716-446655440000/document-1/content.txt",
				"files/550e8400-e29b-41d4-a716-446655440000/document-2/content.txt",
			},
			{},
		},
	}
	service := &Service{ctx: context.Background(), repo: repository, cloud: storage}

	if err := service.DeleteCloudData(userID); err != nil {
		t.Fatalf("DeleteCloudData() error = %v", err)
	}

	want := []string{
		"files/550e8400-e29b-41d4-a716-446655440000/document-1/content.txt",
		"files/550e8400-e29b-41d4-a716-446655440000/document-2/content.txt",
	}
	if !reflect.DeepEqual(storage.deletedKey, want) {
		t.Fatalf("deleted keys = %#v, want %#v", storage.deletedKey, want)
	}
	if repository.lockReleased {
		t.Fatal("successful cleanup should keep the deletion lock until Better Auth deletes the user")
	}
}

func TestDeleteCloudDataReleasesLockWhenR2Fails(t *testing.T) {
	const userID = "550e8400-e29b-41d4-a716-446655440000"
	repository := &fakeWorkspaceRepository{}
	storage := &fakeWorkspaceCloudStorage{
		listedKeys: []string{
			"files/550e8400-e29b-41d4-a716-446655440000/document/content.txt",
		},
		deleteErr: errors.New("R2 unavailable"),
	}
	service := &Service{ctx: context.Background(), repo: repository, cloud: storage}

	if err := service.DeleteCloudData(userID); err == nil {
		t.Fatal("DeleteCloudData() should fail when R2 deletion fails")
	}
	if !repository.lockReleased {
		t.Fatal("failed cleanup should release the deletion lock")
	}
}

func TestMergeOwnedObjectKeysRejectsAnotherUserNamespace(t *testing.T) {
	_, err := mergeOwnedObjectKeys(
		"550e8400-e29b-41d4-a716-446655440000",
		[]string{"files/another-user/document/content.txt"},
	)
	if err == nil {
		t.Fatal("mergeOwnedObjectKeys() should reject an object outside the user's namespace")
	}
}

func TestCompleteDocumentUploadPassesValidatedMetadataToRepository(t *testing.T) {
	const (
		userID     = "550e8400-e29b-41d4-a716-446655440000"
		documentID = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
	)
	repository := &fakeWorkspaceRepository{item: models.WorkspaceItem{
		ID:   documentID,
		Type: models.WorkspaceItemTypeDocument,
	}}
	service := &Service{ctx: context.Background(), repo: repository}

	_, err := service.CompleteDocumentUpload(
		userID,
		documentID,
		models.CompleteDocumentUploadParams{
			R2ObjectKey:     " files/550e8400-e29b-41d4-a716-446655440000/6ba7b810-9dad-11d1-80b4-00c04fd430c8/content.txt ",
			ContentType:     " text/markdown ",
			SizeBytes:       42,
			ContentHash:     " hash ",
			ContentRevision: 3,
		},
	)
	if err != nil {
		t.Fatalf("CompleteDocumentUpload() error = %v", err)
	}

	want := models.CompleteDocumentUploadParams{
		DocumentID:      documentID,
		R2ObjectKey:     "files/550e8400-e29b-41d4-a716-446655440000/6ba7b810-9dad-11d1-80b4-00c04fd430c8/content.txt",
		ContentType:     "text/markdown",
		SizeBytes:       42,
		ContentHash:     "hash",
		ContentRevision: 3,
	}
	if !reflect.DeepEqual(repository.completedParams, want) {
		t.Fatalf("completed params = %#v, want %#v", repository.completedParams, want)
	}
}

func TestCompleteDocumentUploadRejectsObjectKeyForAnotherDocument(t *testing.T) {
	service := &Service{
		ctx: context.Background(),
		repo: &fakeWorkspaceRepository{item: models.WorkspaceItem{
			ID:   "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
			Type: models.WorkspaceItemTypeDocument,
		}},
	}

	_, err := service.CompleteDocumentUpload(
		"550e8400-e29b-41d4-a716-446655440000",
		"6ba7b810-9dad-11d1-80b4-00c04fd430c8",
		models.CompleteDocumentUploadParams{
			R2ObjectKey:     "files/another-user/another-document/content.txt",
			ContentType:     "text/markdown",
			SizeBytes:       42,
			ContentHash:     "hash",
			ContentRevision: 1,
		},
	)
	if !errors.Is(err, ErrWorkspaceDocumentObjectKeyInvalid) {
		t.Fatalf("CompleteDocumentUpload() error = %v, want ErrWorkspaceDocumentObjectKeyInvalid", err)
	}
}
