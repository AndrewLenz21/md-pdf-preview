package cloudflare

import (
	"context"
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
