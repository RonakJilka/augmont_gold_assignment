CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS ix_products_name_trgm ON products USING gin (name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_categories_name_trgm ON categories USING gin (name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_categories_name_active ON categories (LOWER(name)) WHERE deleted_at IS NULL;
