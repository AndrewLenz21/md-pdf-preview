package workspace

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/andrew/md-pdf-preview/server/src/models"
	cloudflare_service "github.com/andrew/md-pdf-preview/server/src/services/cloudflare"
	"github.com/jackc/pgx/v5"
	"github.com/labstack/echo/v4"
)

type fakeWorkspaceService struct {
	createdParams models.CreateWorkspaceItemParams
	createdUserID string
	listUserID    string
	getErr        error
	items         []models.WorkspaceItem
	uploadURL     cloudflare_service.PresignedDocumentURL
}

func (service *fakeWorkspaceService) Create(userID string, params models.CreateWorkspaceItemParams) (models.WorkspaceItem, error) {
	service.createdUserID = userID
	service.createdParams = params
	return models.WorkspaceItem{ID: "item-1", UserID: userID, Name: params.Name, Type: params.Type}, nil
}

func (service *fakeWorkspaceService) List(userID string) ([]models.WorkspaceItem, error) {
	service.listUserID = userID
	return service.items, nil
}

func (service *fakeWorkspaceService) Get(string, string) (models.WorkspaceItem, error) {
	if service.getErr != nil {
		return models.WorkspaceItem{}, service.getErr
	}
	return models.WorkspaceItem{ID: "item-1"}, nil
}

func (service *fakeWorkspaceService) Update(string, models.UpdateWorkspaceItemParams) (models.WorkspaceItem, error) {
	return models.WorkspaceItem{ID: "item-1"}, nil
}

func (service *fakeWorkspaceService) Delete(string, string) (int, error) {
	return 1, nil
}

func (service *fakeWorkspaceService) GenerateDocumentUploadURL(string, string, string) (cloudflare_service.PresignedDocumentURL, error) {
	return service.uploadURL, nil
}

func (service *fakeWorkspaceService) GenerateDocumentDownloadURL(string, string) (cloudflare_service.PresignedDocumentURL, error) {
	return service.uploadURL, nil
}

func newWorkspaceTestServer(service *fakeWorkspaceService) *echo.Echo {
	server := echo.New()
	NewWithServiceFactory(func(context.Context) workspaceService {
		return service
	}).RegisterRoutes(server)
	return server
}

func TestCreateUsesBFFUserHeader(t *testing.T) {
	service := &fakeWorkspaceService{}
	server := newWorkspaceTestServer(service)

	request := httptest.NewRequest(
		http.MethodPost,
		"/workspace/items",
		strings.NewReader(`{"name":"Notes","type":"folder"}`),
	)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-User-Id", "user-123")
	recorder := httptest.NewRecorder()

	server.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusCreated)
	}
	if service.createdUserID != "user-123" {
		t.Fatalf("created user ID = %s, want user-123", service.createdUserID)
	}
	if service.createdParams.Name != "Notes" || service.createdParams.Type != models.WorkspaceItemTypeFolder {
		t.Fatalf("unexpected create params: %#v", service.createdParams)
	}
}

func TestListUsesContextUserAndReturnsItems(t *testing.T) {
	service := &fakeWorkspaceService{
		items: []models.WorkspaceItem{{ID: "item-1", Name: "Notes"}},
	}
	server := echo.New()
	controller := NewWithServiceFactory(func(context.Context) workspaceService {
		return service
	})
	server.GET("/workspace/items", controller.list)

	request := httptest.NewRequest(http.MethodGet, "/workspace/items", nil)
	recorder := httptest.NewRecorder()
	context := server.NewContext(request, recorder)
	context.Set("user_id", "user-456")

	if err := controller.list(context); err != nil {
		t.Fatalf("list error = %v", err)
	}
	if service.listUserID != "user-456" {
		t.Fatalf("list user ID = %s, want user-456", service.listUserID)
	}

	var items []models.WorkspaceItem
	if err := json.Unmarshal(recorder.Body.Bytes(), &items); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	if len(items) != 1 || items[0].ID != "item-1" {
		t.Fatalf("unexpected list response: %#v", items)
	}
}

func TestGetMapsMissingItemToNotFound(t *testing.T) {
	service := &fakeWorkspaceService{getErr: errors.Join(errors.New("get workspace item"), pgx.ErrNoRows)}
	server := echo.New()
	controller := NewWithServiceFactory(func(context.Context) workspaceService {
		return service
	})

	request := httptest.NewRequest(http.MethodGet, "/workspace/items/item-1", nil)
	recorder := httptest.NewRecorder()
	context := server.NewContext(request, recorder)
	context.Set("user_id", "user-123")

	err := controller.get(context)
	var httpError *echo.HTTPError
	if !errors.As(err, &httpError) || httpError.Code != http.StatusNotFound {
		t.Fatalf("error = %v, want HTTP 404", err)
	}
}

func TestGenerateUploadURLReturnsSafeResponseShape(t *testing.T) {
	service := &fakeWorkspaceService{
		uploadURL: cloudflare_service.PresignedDocumentURL{
			ObjectKey: "files/user/document/content.txt",
			URL:       "https://example.com/presigned",
		},
	}
	server := echo.New()
	controller := NewWithServiceFactory(func(context.Context) workspaceService {
		return service
	})

	request := httptest.NewRequest(
		http.MethodPost,
		"/workspace/documents/document/upload-url",
		strings.NewReader(`{"contentType":"text/plain"}`),
	)
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	context := server.NewContext(request, recorder)
	context.SetParamNames("documentID")
	context.SetParamValues("document")
	context.Set("user_id", "user-123")

	if err := controller.generateUploadURL(context); err != nil {
		t.Fatalf("generate upload URL error = %v", err)
	}
	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}

	var response map[string]string
	if err := json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode upload response: %v", err)
	}
	if response["objectKey"] != service.uploadURL.ObjectKey || response["url"] != service.uploadURL.URL {
		t.Fatalf("unexpected upload response: %#v", response)
	}
}
