package health

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestHealth(t *testing.T) {
	applicationServer := echo.New()
	RegisterRoutes(applicationServer)
	testServer := httptest.NewServer(applicationServer)
	defer testServer.Close()

	response, err := testServer.Client().Get(testServer.URL + "/health")
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, response.StatusCode)
	}

	var body map[string]string
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}

	if body["status"] != "ok" {
		t.Fatalf("unexpected status: %s", body["status"])
	}
}
