package cloudflare

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func TestInitR2DisablesStorageWhenConfigurationIsIncomplete(t *testing.T) {
	t.Setenv("R2_ACCESS_KEY_ID", "")
	t.Setenv("R2_SECRET_ACCESS_KEY", "")
	t.Setenv("R2_ENDPOINT", "")
	t.Setenv("R2_BUCKET_NAME", "")

	Storage = nil
	InitR2()

	if Storage != nil {
		t.Fatal("R2 storage should remain disabled when configuration is incomplete")
	}
}

func TestPresignURLsUseConfiguredR2Endpoint(t *testing.T) {
	cfg, err := awsconfig.LoadDefaultConfig(
		context.Background(),
		awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider("access-key", "secret-key", ""),
		),
		awsconfig.WithRegion("auto"),
	)
	if err != nil {
		t.Fatalf("load AWS SDK config: %v", err)
	}

	client := s3.NewFromConfig(cfg, func(options *s3.Options) {
		options.BaseEndpoint = aws.String("https://account.r2.cloudflarestorage.com")
	})
	storage := &R2Storage{
		Client:        client,
		PresignClient: s3.NewPresignClient(client),
		BucketName:    "documents",
	}

	uploadURL, err := storage.PresignUploadURL(
		context.Background(),
		"files/user/document/content.txt",
		"text/plain; charset=utf-8",
	)
	if err != nil {
		t.Fatalf("presign upload URL: %v", err)
	}

	parsedUploadURL, err := url.Parse(uploadURL)
	if err != nil {
		t.Fatalf("parse upload URL: %v", err)
	}

	if parsedUploadURL.Host != "documents.account.r2.cloudflarestorage.com" {
		t.Fatalf("unexpected upload URL host: %s", parsedUploadURL.Host)
	}

	if parsedUploadURL.Query().Get("x-id") != "PutObject" {
		t.Fatal("upload URL should target the PutObject operation")
	}

	downloadURL, err := storage.PresignDownloadURL(
		context.Background(),
		"files/user/document/content.txt",
	)
	if err != nil {
		t.Fatalf("presign download URL: %v", err)
	}

	parsedDownloadURL, err := url.Parse(downloadURL)
	if err != nil {
		t.Fatalf("parse download URL: %v", err)
	}

	if parsedDownloadURL.Host != "documents.account.r2.cloudflarestorage.com" {
		t.Fatalf("unexpected download URL host: %s", parsedDownloadURL.Host)
	}
}

func TestPutObjectOmitsEmptyContentEncoding(t *testing.T) {
	var requestHeaders http.Header
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		requestHeaders = request.Header.Clone()
		writer.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	cfg, err := awsconfig.LoadDefaultConfig(
		context.Background(),
		awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider("access-key", "secret-key", ""),
		),
		awsconfig.WithRegion("auto"),
	)
	if err != nil {
		t.Fatalf("load AWS SDK config: %v", err)
	}

	client := s3.NewFromConfig(cfg, func(options *s3.Options) {
		options.BaseEndpoint = aws.String(server.URL)
		options.UsePathStyle = true
	})
	storage := &R2Storage{Client: client, BucketName: "documents"}

	if err := storage.PutObject(
		context.Background(),
		"documents",
		"logs/test.json.gz",
		[]byte("compressed log"),
		"application/gzip",
		"",
	); err != nil {
		t.Fatalf("put object: %v", err)
	}

	if encoding := requestHeaders.Get("Content-Encoding"); encoding != "" {
		t.Fatalf("Content-Encoding should be omitted, got %q", encoding)
	}
	if contentType := requestHeaders.Get("Content-Type"); contentType != "application/gzip" {
		t.Fatalf("unexpected Content-Type: %q", contentType)
	}
}

func TestListObjectKeysFollowsR2Pagination(t *testing.T) {
	var continuationTokens []string
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		continuationTokens = append(continuationTokens, request.URL.Query().Get("continuation-token"))
		writer.Header().Set("Content-Type", "application/xml")
		if request.URL.Query().Get("continuation-token") == "" {
			_, _ = writer.Write([]byte(`<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult>
  <Name>documents</Name>
  <Prefix>files/user/</Prefix>
  <KeyCount>1</KeyCount>
  <MaxKeys>1</MaxKeys>
  <IsTruncated>true</IsTruncated>
  <NextContinuationToken>page-2</NextContinuationToken>
  <Contents><Key>files/user/one/content.txt</Key></Contents>
</ListBucketResult>`))
			return
		}
		_, _ = writer.Write([]byte(`<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult>
  <Name>documents</Name>
  <Prefix>files/user/</Prefix>
  <KeyCount>1</KeyCount>
  <MaxKeys>1</MaxKeys>
  <IsTruncated>false</IsTruncated>
  <Contents><Key>files/user/two/content.txt</Key></Contents>
</ListBucketResult>`))
	}))
	defer server.Close()

	cfg, err := awsconfig.LoadDefaultConfig(
		context.Background(),
		awsconfig.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider("access-key", "secret-key", ""),
		),
		awsconfig.WithRegion("auto"),
	)
	if err != nil {
		t.Fatalf("load AWS SDK config: %v", err)
	}

	client := s3.NewFromConfig(cfg, func(options *s3.Options) {
		options.BaseEndpoint = aws.String(server.URL)
		options.UsePathStyle = true
	})
	storage := &R2Storage{Client: client, BucketName: "documents"}

	keys, err := storage.ListObjectKeys(context.Background(), "files/user/")
	if err != nil {
		t.Fatalf("list object keys: %v", err)
	}

	wantKeys := []string{"files/user/one/content.txt", "files/user/two/content.txt"}
	if len(keys) != len(wantKeys) || keys[0] != wantKeys[0] || keys[1] != wantKeys[1] {
		t.Fatalf("keys = %#v, want %#v", keys, wantKeys)
	}
	if len(continuationTokens) != 2 || continuationTokens[1] != "page-2" {
		t.Fatalf("continuation tokens = %#v, want [\"\" \"page-2\"]", continuationTokens)
	}
}
