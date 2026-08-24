package account

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	workspace_service "github.com/andrew/md-pdf-preview/server/src/services/workspaces"
	"github.com/labstack/echo/v4"
)

type fakeAccountService struct {
	userID string
	err    error
}

func (service *fakeAccountService) DeleteCloudData(userID string) error {
	service.userID = userID
	return service.err
}

func TestDeleteCloudDataUsesAuthenticatedBFFIdentity(t *testing.T) {
	service := &fakeAccountService{}
	controller := NewWithServiceFactory(func(context.Context) accountService {
		return service
	})
	e := echo.New()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodDelete, "/account/cloud-data", nil)
	context := e.NewContext(request, recorder)
	context.Set("user_id", "user-123")

	if err := controller.deleteCloudData(context); err != nil {
		t.Fatalf("deleteCloudData() error = %v", err)
	}
	if recorder.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusNoContent)
	}
	if service.userID != "user-123" {
		t.Fatalf("service user ID = %q, want user-123", service.userID)
	}
}

func TestDeleteCloudDataRequiresAuthenticatedIdentity(t *testing.T) {
	service := &fakeAccountService{}
	controller := NewWithServiceFactory(func(context.Context) accountService {
		return service
	})
	e := echo.New()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodDelete, "/account/cloud-data", nil)
	context := e.NewContext(request, recorder)

	err := controller.deleteCloudData(context)
	var httpError *echo.HTTPError
	if !errors.As(err, &httpError) || httpError.Code != http.StatusUnauthorized {
		t.Fatalf("error = %v, want HTTP 401", err)
	}
}

func TestDeleteCloudDataMapsCleanupFailureToSafeError(t *testing.T) {
	service := &fakeAccountService{err: errors.New("R2 credentials leaked in internal error")}
	controller := NewWithServiceFactory(func(context.Context) accountService {
		return service
	})
	e := echo.New()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodDelete, "/account/cloud-data", nil)
	context := e.NewContext(request, recorder)
	context.Set("user_id", "user-123")

	err := controller.deleteCloudData(context)
	var httpError *echo.HTTPError
	if !errors.As(err, &httpError) || httpError.Code != http.StatusInternalServerError {
		t.Fatalf("error = %v, want HTTP 500", err)
	}
	if httpError.Message != "account cleanup failed" {
		t.Fatalf("message = %v, want safe cleanup message", httpError.Message)
	}
}

func TestDeleteCloudDataMapsConcurrentDeletion(t *testing.T) {
	service := &fakeAccountService{err: workspace_service.ErrAccountDeletionInProgress}
	controller := NewWithServiceFactory(func(context.Context) accountService {
		return service
	})
	e := echo.New()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodDelete, "/account/cloud-data", nil)
	context := e.NewContext(request, recorder)
	context.Set("user_id", "user-123")

	err := controller.deleteCloudData(context)
	var httpError *echo.HTTPError
	if !errors.As(err, &httpError) || httpError.Code != http.StatusConflict {
		t.Fatalf("error = %v, want HTTP 409", err)
	}
}
