package cloudflare_service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	cloudflare_config "github.com/andrew/md-pdf-preview/server/src/config/cloudflare"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/jackc/pgx/v5/pgtype"
)

var ErrStorageNotInitialized = errors.New("Cloudflare R2 storage is not initialized")

type Service struct {
	storage *cloudflare_config.R2Storage
}

type PresignedDocumentURL struct {
	ObjectKey string
	URL       string
}

type MultipartUpload struct {
	ObjectKey string
	UploadID  string
}

// 🏗️ New creates a Cloudflare service backed by the global R2 configuration.
func New() *Service {
	return NewWithStorage(cloudflare_config.Storage)
}

// 🧪 NewWithStorage keeps the service easy to test without connecting to R2.
func NewWithStorage(storage *cloudflare_config.R2Storage) *Service {
	return &Service{storage: storage}
}

// 🔑 BuildDocumentObjectKey creates the stable private key for a document.
func BuildDocumentObjectKey(userID, documentID string) (string, error) {
	canonicalUserID, err := canonicalUUID(userID, "user ID")
	if err != nil {
		return "", err
	}

	canonicalDocumentID, err := canonicalUUID(documentID, "document ID")
	if err != nil {
		return "", err
	}

	return fmt.Sprintf(
		"files/%s/%s/content.txt",
		canonicalUserID,
		canonicalDocumentID,
	), nil
}

// ☁️ GenerateDocumentUploadURL creates a short-lived direct upload URL.
func (service *Service) GenerateDocumentUploadURL(
	ctx context.Context,
	userID string,
	documentID string,
	contentType string,
) (PresignedDocumentURL, error) {
	storage, err := service.requireStorage()
	if err != nil {
		return PresignedDocumentURL{}, err
	}

	contentType = strings.TrimSpace(contentType)
	if contentType == "" {
		return PresignedDocumentURL{}, errors.New("document content type cannot be empty")
	}

	objectKey, err := BuildDocumentObjectKey(userID, documentID)
	if err != nil {
		return PresignedDocumentURL{}, err
	}

	url, err := storage.PresignUploadURL(ctx, objectKey, contentType)
	if err != nil {
		return PresignedDocumentURL{}, fmt.Errorf("generate document upload URL: %w", err)
	}

	return PresignedDocumentURL{ObjectKey: objectKey, URL: url}, nil
}

// 📥 GenerateDocumentDownloadURL creates a short-lived direct download URL.
func (service *Service) GenerateDocumentDownloadURL(
	ctx context.Context,
	userID string,
	documentID string,
) (PresignedDocumentURL, error) {
	storage, err := service.requireStorage()
	if err != nil {
		return PresignedDocumentURL{}, err
	}

	objectKey, err := BuildDocumentObjectKey(userID, documentID)
	if err != nil {
		return PresignedDocumentURL{}, err
	}

	url, err := storage.PresignDownloadURL(ctx, objectKey)
	if err != nil {
		return PresignedDocumentURL{}, fmt.Errorf("generate document download URL: %w", err)
	}

	return PresignedDocumentURL{ObjectKey: objectKey, URL: url}, nil
}

// 🧹 DeleteDocument removes the current R2 object for a document.
func (service *Service) DeleteDocument(
	ctx context.Context,
	userID string,
	documentID string,
) error {
	storage, err := service.requireStorage()
	if err != nil {
		return err
	}

	objectKey, err := BuildDocumentObjectKey(userID, documentID)
	if err != nil {
		return err
	}

	if err := storage.DeleteObject(ctx, objectKey); err != nil {
		return fmt.Errorf("delete document object: %w", err)
	}

	return nil
}

// 📦 DeleteObjects removes a batch of persisted object keys.
func (service *Service) DeleteObjects(ctx context.Context, objectKeys []string) error {
	storage, err := service.requireStorage()
	if err != nil {
		return err
	}

	if err := storage.DeleteObjects(ctx, objectKeys); err != nil {
		return fmt.Errorf("delete document objects: %w", err)
	}

	return nil
}

// PutLoggerObject stores one compressed request log in the shared R2 bucket.
func (service *Service) PutLoggerObject(ctx context.Context, key string, body []byte) error {
	storage, err := service.requireStorage()
	if err != nil {
		return err
	}

	if strings.TrimSpace(key) == "" {
		return errors.New("logger object key cannot be empty")
	}
	if len(body) == 0 {
		return errors.New("logger object cannot be empty")
	}

	if err := storage.PutObject(
		ctx,
		storage.BucketName,
		key,
		body,
		"application/gzip",
		"",
	); err != nil {
		return fmt.Errorf(
			"put logger object in R2 (bucket=%q, key=%q): %w",
			storage.BucketName,
			key,
			err,
		)
	}

	return nil
}

// 🧩 InitiateMultipartUpload prepares a large document upload.
func (service *Service) InitiateMultipartUpload(
	ctx context.Context,
	userID string,
	documentID string,
	contentType string,
) (MultipartUpload, error) {
	storage, err := service.requireStorage()
	if err != nil {
		return MultipartUpload{}, err
	}

	objectKey, err := BuildDocumentObjectKey(userID, documentID)
	if err != nil {
		return MultipartUpload{}, err
	}

	contentType = strings.TrimSpace(contentType)
	if contentType == "" {
		return MultipartUpload{}, errors.New("multipart content type cannot be empty")
	}

	uploadID, err := storage.InitiateMultipartUpload(ctx, objectKey, contentType)
	if err != nil {
		return MultipartUpload{}, fmt.Errorf("initiate document multipart upload: %w", err)
	}

	return MultipartUpload{ObjectKey: objectKey, UploadID: uploadID}, nil
}

// 🔗 GenerateMultipartPartURL creates a URL for one multipart part.
func (service *Service) GenerateMultipartPartURL(
	ctx context.Context,
	userID string,
	documentID string,
	uploadID string,
	partNumber int,
) (string, error) {
	storage, err := service.requireStorage()
	if err != nil {
		return "", err
	}

	objectKey, err := BuildDocumentObjectKey(userID, documentID)
	if err != nil {
		return "", err
	}

	if strings.TrimSpace(uploadID) == "" || partNumber < 1 {
		return "", errors.New("multipart upload ID and part number are required")
	}

	url, err := storage.PresignUploadPart(ctx, objectKey, uploadID, partNumber)
	if err != nil {
		return "", fmt.Errorf("generate multipart part URL: %w", err)
	}

	return url, nil
}

// ✅ CompleteMultipartUpload finalizes all uploaded parts in R2.
func (service *Service) CompleteMultipartUpload(
	ctx context.Context,
	userID string,
	documentID string,
	uploadID string,
	parts []types.CompletedPart,
) error {
	storage, err := service.requireStorage()
	if err != nil {
		return err
	}

	objectKey, err := BuildDocumentObjectKey(userID, documentID)
	if err != nil {
		return err
	}

	if strings.TrimSpace(uploadID) == "" || len(parts) == 0 {
		return errors.New("multipart upload ID and parts are required")
	}

	if err := storage.CompleteMultipartUpload(ctx, objectKey, uploadID, parts); err != nil {
		return fmt.Errorf("complete document multipart upload: %w", err)
	}

	return nil
}

// ⚠️ AbortMultipartUpload cancels an unfinished multipart upload.
func (service *Service) AbortMultipartUpload(
	ctx context.Context,
	userID string,
	documentID string,
	uploadID string,
) error {
	storage, err := service.requireStorage()
	if err != nil {
		return err
	}

	objectKey, err := BuildDocumentObjectKey(userID, documentID)
	if err != nil {
		return err
	}

	if strings.TrimSpace(uploadID) == "" {
		return errors.New("multipart upload ID is required")
	}

	if err := storage.AbortMultipartUpload(ctx, objectKey, uploadID); err != nil {
		return fmt.Errorf("abort document multipart upload: %w", err)
	}

	return nil
}

func (service *Service) requireStorage() (*cloudflare_config.R2Storage, error) {
	if service == nil || service.storage == nil {
		return nil, ErrStorageNotInitialized
	}

	return service.storage, nil
}

func canonicalUUID(value, fieldName string) (string, error) {
	var parsed pgtype.UUID
	if err := parsed.Scan(strings.TrimSpace(value)); err != nil {
		return "", fmt.Errorf("invalid %s: %w", fieldName, err)
	}

	return parsed.String(), nil
}
