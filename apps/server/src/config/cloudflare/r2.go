package cloudflare

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

type R2Storage struct {
	Client        *s3.Client
	PresignClient *s3.PresignClient
	BucketName    string
}

var Storage *R2Storage

func InitR2() {
	accessKey := os.Getenv("R2_ACCESS_KEY_ID")
	secretKey := os.Getenv("R2_SECRET_ACCESS_KEY")
	endpoint := os.Getenv("R2_ENDPOINT")
	bucketName := os.Getenv("R2_BUCKET_NAME")

	if accessKey == "" || secretKey == "" || endpoint == "" || bucketName == "" {
		fmt.Println("[R2] missing environment variables; R2 features are disabled")
		return
	}

	cfg, err := config.LoadDefaultConfig(
		context.Background(),
		config.WithCredentialsProvider(
			credentials.NewStaticCredentialsProvider(accessKey, secretKey, ""),
		),
		config.WithRegion("auto"),
	)
	if err != nil {
		fmt.Printf("[R2] failed to load SDK config: %v\n", err)
		return
	}

	client := s3.NewFromConfig(cfg, func(options *s3.Options) {
		options.BaseEndpoint = aws.String(endpoint)
	})

	if _, err := client.ListObjectsV2(context.Background(), &s3.ListObjectsV2Input{
		Bucket:  aws.String(bucketName),
		MaxKeys: aws.Int32(1),
	}); err != nil {
		fmt.Printf("[R2] connection test failed: %v\n", err)
		return
	}

	Storage = &R2Storage{
		Client:        client,
		PresignClient: s3.NewPresignClient(client),
		BucketName:    bucketName,
	}

	fmt.Printf("[R2] connected to bucket %s\n", bucketName)
}

func (storage *R2Storage) InitiateMultipartUpload(
	ctx context.Context,
	key string,
	contentType string,
) (string, error) {
	input := &s3.CreateMultipartUploadInput{
		Bucket:      aws.String(storage.BucketName),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}

	response, err := storage.Client.CreateMultipartUpload(ctx, input)
	if err != nil {
		return "", fmt.Errorf("initiate R2 multipart upload: %w", err)
	}

	if response.UploadId == nil {
		return "", fmt.Errorf("initiate R2 multipart upload: response did not include an upload ID")
	}

	return *response.UploadId, nil
}

func (storage *R2Storage) PresignUploadPart(
	ctx context.Context,
	key string,
	uploadID string,
	partNumber int,
) (string, error) {
	input := &s3.UploadPartInput{
		Bucket:     aws.String(storage.BucketName),
		Key:        aws.String(key),
		UploadId:   aws.String(uploadID),
		PartNumber: aws.Int32(int32(partNumber)),
	}

	request, err := storage.PresignClient.PresignUploadPart(ctx, input, func(options *s3.PresignOptions) {
		options.Expires = 15 * time.Minute
	})
	if err != nil {
		return "", fmt.Errorf("presign R2 multipart part: %w", err)
	}

	return request.URL, nil
}

func (storage *R2Storage) CompleteMultipartUpload(
	ctx context.Context,
	key string,
	uploadID string,
	parts []types.CompletedPart,
) error {
	input := &s3.CompleteMultipartUploadInput{
		Bucket:   aws.String(storage.BucketName),
		Key:      aws.String(key),
		UploadId: aws.String(uploadID),
		MultipartUpload: &types.CompletedMultipartUpload{
			Parts: parts,
		},
	}

	if _, err := storage.Client.CompleteMultipartUpload(ctx, input); err != nil {
		return fmt.Errorf("complete R2 multipart upload: %w", err)
	}

	return nil
}

func (storage *R2Storage) AbortMultipartUpload(
	ctx context.Context,
	key string,
	uploadID string,
) error {
	input := &s3.AbortMultipartUploadInput{
		Bucket:   aws.String(storage.BucketName),
		Key:      aws.String(key),
		UploadId: aws.String(uploadID),
	}

	if _, err := storage.Client.AbortMultipartUpload(ctx, input); err != nil {
		return fmt.Errorf("abort R2 multipart upload: %w", err)
	}

	return nil
}

func (storage *R2Storage) PresignUploadURL(
	ctx context.Context,
	key string,
	contentType string,
) (string, error) {
	input := &s3.PutObjectInput{
		Bucket:      aws.String(storage.BucketName),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}

	request, err := storage.PresignClient.PresignPutObject(ctx, input, func(options *s3.PresignOptions) {
		options.Expires = 15 * time.Minute
	})
	if err != nil {
		return "", fmt.Errorf("presign R2 upload: %w", err)
	}

	return request.URL, nil
}

func (storage *R2Storage) PresignDownloadURL(
	ctx context.Context,
	key string,
) (string, error) {
	input := &s3.GetObjectInput{
		Bucket: aws.String(storage.BucketName),
		Key:    aws.String(key),
	}

	request, err := storage.PresignClient.PresignGetObject(ctx, input, func(options *s3.PresignOptions) {
		options.Expires = 60 * time.Minute
	})
	if err != nil {
		return "", fmt.Errorf("presign R2 download: %w", err)
	}

	return request.URL, nil
}

func (storage *R2Storage) DeleteObject(ctx context.Context, key string) error {
	if _, err := storage.Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(storage.BucketName),
		Key:    aws.String(key),
	}); err != nil {
		return fmt.Errorf("delete R2 object: %w", err)
	}

	return nil
}

func (storage *R2Storage) DeleteObjects(ctx context.Context, keys []string) error {
	if len(keys) == 0 {
		return nil
	}

	objects := make([]types.ObjectIdentifier, 0, len(keys))
	for _, key := range keys {
		objects = append(objects, types.ObjectIdentifier{Key: aws.String(key)})
	}

	if _, err := storage.Client.DeleteObjects(ctx, &s3.DeleteObjectsInput{
		Bucket: aws.String(storage.BucketName),
		Delete: &types.Delete{
			Objects: objects,
			Quiet:   aws.Bool(true),
		},
	}); err != nil {
		return fmt.Errorf("delete R2 objects: %w", err)
	}

	return nil
}

func (storage *R2Storage) PutObject(
	ctx context.Context,
	bucketName string,
	key string,
	body []byte,
	contentType string,
	contentEncoding string,
) error {
	if storage == nil || storage.Client == nil {
		return fmt.Errorf("R2 client is not initialized")
	}
	if bucketName == "" {
		return fmt.Errorf("R2 bucket name cannot be empty")
	}

	input := &s3.PutObjectInput{
		Bucket:          aws.String(bucketName),
		Key:             aws.String(key),
		Body:            bytes.NewReader(body),
		ContentType:     aws.String(contentType),
		ContentEncoding: aws.String(contentEncoding),
	}

	if _, err := storage.Client.PutObject(ctx, input); err != nil {
		return fmt.Errorf("put R2 object: %w", err)
	}

	return nil
}
