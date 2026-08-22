package models

import "time"

const (
	WorkspaceItemTypeFolder   = "folder"
	WorkspaceItemTypeDocument = "document"
)

type WorkspaceItem struct {
	ID              string     `json:"id"`
	UserID          string     `json:"userId"`
	ParentID        *string    `json:"parentId"`
	Type            string     `json:"type"`
	Name            string     `json:"name"`
	Color           *string    `json:"color"`
	Icon            *string    `json:"icon"`
	Favorite        bool       `json:"favorite"`
	SortOrder       int        `json:"sortOrder"`
	R2ObjectKey     *string    `json:"-"`
	ContentType     *string    `json:"contentType,omitempty"`
	SizeBytes       *int64     `json:"sizeBytes,omitempty"`
	ContentHash     *string    `json:"-"`
	ContentRevision int64      `json:"contentRevision"`
	StorageStatus   *string    `json:"storageStatus,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
	DeletedAt       *time.Time `json:"deletedAt,omitempty"`
}

type CreateWorkspaceItemParams struct {
	ParentID *string
	Name     string
	Type     string
	Color    *string
	Icon     *string
}

type UpdateWorkspaceItemParams struct {
	ItemID    string
	Name      string
	ParentID  *string
	Color     *string
	Icon      *string
	Favorite  bool
	SortOrder int
}
