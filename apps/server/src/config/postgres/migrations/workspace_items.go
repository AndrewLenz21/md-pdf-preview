package migrations

var workspaceItemsSchemaStatements = []string{
	`CREATE TABLE IF NOT EXISTS workspace_items (
		id uuid DEFAULT pg_catalog.gen_random_uuid() NOT NULL PRIMARY KEY,
		user_id uuid NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
		parent_id uuid,
		item_type text NOT NULL,
		name text NOT NULL,
		color text,
		icon text,
		favorite boolean NOT NULL DEFAULT false,
		sort_order integer NOT NULL DEFAULT 0,
		r2_object_key text,
		content_type text,
		size_bytes bigint,
		content_hash text,
		content_revision bigint NOT NULL DEFAULT 0,
		storage_status text,
		created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
		deleted_at timestamptz,
		CONSTRAINT workspace_items_user_id_id_key UNIQUE (user_id, id),
		CONSTRAINT workspace_items_parent_owner_fkey
			FOREIGN KEY (user_id, parent_id)
			REFERENCES workspace_items (user_id, id)
			ON DELETE CASCADE,
		CONSTRAINT workspace_items_type_check
			CHECK (item_type IN ('folder', 'document')),
		CONSTRAINT workspace_items_name_check
			CHECK (char_length(btrim(name)) > 0),
		CONSTRAINT workspace_items_color_check
			CHECK (color IS NULL OR color IN ('primary', 'blue', 'violet', 'amber', 'rose', 'emerald')),
		CONSTRAINT workspace_items_icon_check
			CHECK (icon IS NULL OR icon IN (
				'folder', 'briefcase', 'book', 'code', 'lightbulb', 'archive', 'star', 'target',
				'calendar', 'image', 'music', 'heart', 'users', 'map', 'key', 'wrench'
			)),
		CONSTRAINT workspace_items_size_check
			CHECK (size_bytes IS NULL OR size_bytes >= 0),
		CONSTRAINT workspace_items_revision_check
			CHECK (content_revision >= 0),
		CONSTRAINT workspace_items_sort_order_check
			CHECK (sort_order >= 0),
		CONSTRAINT workspace_items_storage_status_check
			CHECK (storage_status IS NULL OR storage_status IN ('pending', 'ready', 'failed')),
		CONSTRAINT workspace_items_folder_fields_check
			CHECK (
				(item_type = 'folder' AND color IS NOT NULL AND icon IS NOT NULL AND favorite = false AND storage_status IS NULL)
				OR item_type = 'document'
			)
	)`,
	`CREATE INDEX IF NOT EXISTS workspace_items_user_parent_idx
		ON workspace_items (user_id, parent_id, sort_order, created_at)
		WHERE deleted_at IS NULL`,
	`CREATE INDEX IF NOT EXISTS workspace_items_user_updated_idx
		ON workspace_items (user_id, updated_at DESC)
		WHERE deleted_at IS NULL`,
	`CREATE UNIQUE INDEX IF NOT EXISTS workspace_items_r2_object_key_idx
		ON workspace_items (r2_object_key)
		WHERE r2_object_key IS NOT NULL`,
	`CREATE OR REPLACE FUNCTION fn_workspace_items_set_updated_at()
	RETURNS trigger
	LANGUAGE plpgsql
	AS $$
	BEGIN
		NEW.updated_at = CURRENT_TIMESTAMP;
		RETURN NEW;
	END;
	$$`,
	`DROP TRIGGER IF EXISTS workspace_items_updated_at_trigger ON workspace_items`,
	`CREATE TRIGGER workspace_items_updated_at_trigger
		BEFORE UPDATE ON workspace_items
		FOR EACH ROW
		EXECUTE FUNCTION fn_workspace_items_set_updated_at()`,
	`CREATE OR REPLACE FUNCTION fn_workspace_item_create(
		p_user_id uuid,
		p_parent_id uuid,
		p_name text,
		p_item_type text,
		p_color text DEFAULT NULL,
		p_icon text DEFAULT NULL
	)
	RETURNS TABLE (
		id uuid,
		user_id uuid,
		parent_id uuid,
		item_type text,
		name text,
		color text,
		icon text,
		favorite boolean,
		sort_order integer,
		r2_object_key text,
		content_type text,
		size_bytes bigint,
		content_hash text,
		content_revision bigint,
		storage_status text,
		created_at timestamptz,
		updated_at timestamptz,
		deleted_at timestamptz
	)
	LANGUAGE plpgsql
	AS $$
	DECLARE
		v_name text := btrim(p_name);
		v_sort_order integer;
		v_id uuid;
	BEGIN
		IF v_name = '' THEN
			RAISE EXCEPTION 'workspace item name cannot be empty';
		END IF;

		IF p_item_type NOT IN ('folder', 'document') THEN
			RAISE EXCEPTION 'workspace item type is invalid';
		END IF;

		IF p_parent_id IS NOT NULL AND NOT EXISTS (
			SELECT 1
			FROM workspace_items parent_item
			WHERE parent_item.id = p_parent_id
				AND parent_item.user_id = p_user_id
				AND parent_item.item_type = 'folder'
				AND parent_item.deleted_at IS NULL
		) THEN
			RAISE EXCEPTION 'workspace item parent does not belong to the user or is not a folder';
		END IF;

		SELECT COALESCE(MAX(sibling.sort_order) + 1, 0)
		INTO v_sort_order
		FROM workspace_items sibling
		WHERE sibling.user_id = p_user_id
			AND sibling.parent_id IS NOT DISTINCT FROM p_parent_id
			AND sibling.deleted_at IS NULL;

		INSERT INTO workspace_items (
			user_id,
			parent_id,
			item_type,
			name,
			color,
			icon,
			favorite,
			sort_order,
			storage_status
		)
		VALUES (
			p_user_id,
			p_parent_id,
			p_item_type,
			v_name,
			CASE WHEN p_item_type = 'folder' THEN COALESCE(p_color, 'primary') ELSE NULL END,
			CASE WHEN p_item_type = 'folder' THEN COALESCE(p_icon, 'folder') ELSE NULL END,
			false,
			v_sort_order,
			CASE WHEN p_item_type = 'document' THEN 'pending' ELSE NULL END
		)
		RETURNING workspace_items.id INTO v_id;

		RETURN QUERY
		SELECT item.id, item.user_id, item.parent_id, item.item_type, item.name,
			item.color, item.icon, item.favorite, item.sort_order, item.r2_object_key,
			item.content_type, item.size_bytes, item.content_hash, item.content_revision,
			item.storage_status, item.created_at, item.updated_at, item.deleted_at
		FROM workspace_items item
		WHERE item.id = v_id;
	END;
	$$`,
	`CREATE OR REPLACE FUNCTION fn_workspace_items_list(p_user_id uuid)
	RETURNS TABLE (
		id uuid,
		user_id uuid,
		parent_id uuid,
		item_type text,
		name text,
		color text,
		icon text,
		favorite boolean,
		sort_order integer,
		r2_object_key text,
		content_type text,
		size_bytes bigint,
		content_hash text,
		content_revision bigint,
		storage_status text,
		created_at timestamptz,
		updated_at timestamptz,
		deleted_at timestamptz
	)
	LANGUAGE sql
	STABLE
	AS $$
		SELECT item.id, item.user_id, item.parent_id, item.item_type, item.name,
			item.color, item.icon, item.favorite, item.sort_order, item.r2_object_key,
			item.content_type, item.size_bytes, item.content_hash, item.content_revision,
			item.storage_status, item.created_at, item.updated_at, item.deleted_at
		FROM workspace_items item
		WHERE item.user_id = $1
			AND item.deleted_at IS NULL
		ORDER BY item.parent_id NULLS FIRST, item.sort_order, item.created_at, item.id;
	$$`,
	`CREATE OR REPLACE FUNCTION fn_workspace_item_get(p_user_id uuid, p_item_id uuid)
	RETURNS TABLE (
		id uuid,
		user_id uuid,
		parent_id uuid,
		item_type text,
		name text,
		color text,
		icon text,
		favorite boolean,
		sort_order integer,
		r2_object_key text,
		content_type text,
		size_bytes bigint,
		content_hash text,
		content_revision bigint,
		storage_status text,
		created_at timestamptz,
		updated_at timestamptz,
		deleted_at timestamptz
	)
	LANGUAGE sql
	STABLE
	AS $$
		SELECT item.id, item.user_id, item.parent_id, item.item_type, item.name,
			item.color, item.icon, item.favorite, item.sort_order, item.r2_object_key,
			item.content_type, item.size_bytes, item.content_hash, item.content_revision,
			item.storage_status, item.created_at, item.updated_at, item.deleted_at
		FROM workspace_items item
		WHERE item.user_id = $1
			AND item.id = $2
			AND item.deleted_at IS NULL;
	$$`,
	`CREATE OR REPLACE FUNCTION fn_workspace_item_update(
		p_user_id uuid,
		p_item_id uuid,
		p_name text,
		p_parent_id uuid,
		p_color text,
		p_icon text,
		p_favorite boolean,
		p_sort_order integer
	)
	RETURNS TABLE (
		id uuid,
		user_id uuid,
		parent_id uuid,
		item_type text,
		name text,
		color text,
		icon text,
		favorite boolean,
		sort_order integer,
		r2_object_key text,
		content_type text,
		size_bytes bigint,
		content_hash text,
		content_revision bigint,
		storage_status text,
		created_at timestamptz,
		updated_at timestamptz,
		deleted_at timestamptz
	)
	LANGUAGE plpgsql
	AS $$
	DECLARE
		v_item workspace_items%ROWTYPE;
		v_name text := btrim(p_name);
	BEGIN
		SELECT item.*
		INTO v_item
		FROM workspace_items item
		WHERE item.id = p_item_id
			AND item.user_id = p_user_id
			AND item.deleted_at IS NULL
		FOR UPDATE;

		IF NOT FOUND THEN
			RAISE EXCEPTION 'workspace item was not found';
		END IF;

		IF v_name = '' THEN
			RAISE EXCEPTION 'workspace item name cannot be empty';
		END IF;

		IF p_parent_id IS NOT NULL AND NOT EXISTS (
			SELECT 1
			FROM workspace_items parent_item
			WHERE parent_item.id = p_parent_id
				AND parent_item.user_id = p_user_id
				AND parent_item.item_type = 'folder'
				AND parent_item.deleted_at IS NULL
		) THEN
			RAISE EXCEPTION 'workspace item parent does not belong to the user or is not a folder';
		END IF;

		IF v_item.item_type = 'folder' AND p_parent_id IS NOT NULL AND EXISTS (
			WITH RECURSIVE descendants AS (
				SELECT item.id
				FROM workspace_items item
				WHERE item.id = p_item_id AND item.user_id = p_user_id

				UNION ALL

				SELECT child.id
				FROM workspace_items child
				JOIN descendants ancestor ON ancestor.id = child.parent_id
				WHERE child.user_id = p_user_id
			)
			SELECT 1
			FROM descendants
			WHERE descendants.id = p_parent_id
		) THEN
			RAISE EXCEPTION 'workspace folder cannot be moved into its own descendants';
		END IF;

		UPDATE workspace_items item
		SET name = v_name,
			parent_id = p_parent_id,
			color = CASE WHEN item.item_type = 'folder' THEN COALESCE(p_color, item.color) ELSE NULL END,
			icon = CASE WHEN item.item_type = 'folder' THEN COALESCE(p_icon, item.icon) ELSE NULL END,
			favorite = CASE WHEN item.item_type = 'document' THEN p_favorite ELSE false END,
			sort_order = GREATEST(p_sort_order, 0)
		WHERE item.id = p_item_id AND item.user_id = p_user_id;

		RETURN QUERY
		SELECT item.id, item.user_id, item.parent_id, item.item_type, item.name,
			item.color, item.icon, item.favorite, item.sort_order, item.r2_object_key,
			item.content_type, item.size_bytes, item.content_hash, item.content_revision,
			item.storage_status, item.created_at, item.updated_at, item.deleted_at
		FROM workspace_items item
		WHERE item.id = p_item_id AND item.user_id = p_user_id;
	END;
	$$`,
	`CREATE OR REPLACE FUNCTION fn_workspace_item_delete(p_user_id uuid, p_item_id uuid)
	RETURNS integer
	LANGUAGE plpgsql
	AS $$
	DECLARE
		v_deleted_count integer;
	BEGIN
		WITH RECURSIVE descendants AS (
			SELECT item.id
			FROM workspace_items item
			WHERE item.id = p_item_id
				AND item.user_id = p_user_id
				AND item.deleted_at IS NULL

			UNION ALL

			SELECT child.id
			FROM workspace_items child
			JOIN descendants ancestor ON ancestor.id = child.parent_id
			WHERE child.user_id = p_user_id
				AND child.deleted_at IS NULL
		)
		UPDATE workspace_items item
		SET deleted_at = CURRENT_TIMESTAMP,
			updated_at = CURRENT_TIMESTAMP
		WHERE item.id IN (SELECT descendants.id FROM descendants);

		GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
		RETURN v_deleted_count;
	END;
	$$`,
}
