-- 012_combisteel_products.sql
-- CombiSteel PIM sync cache (second brand catalog, read directly by combisteelStore).
-- Previously created ad-hoc by scripts/combisteel-sync.mjs (exec_sql) — now tracked
-- as a real migration so the table exists on every project. Public read, service_role write.

CREATE TABLE IF NOT EXISTS combisteel_products (
  id               TEXT PRIMARY KEY,
  sku              TEXT,
  title            TEXT,
  description      TEXT,
  long_description TEXT,
  brand            TEXT,
  ean              TEXT,
  dimensions       TEXT,
  length_mm        INT,
  width_mm         INT,
  height_mm        INT,
  depth_mm         INT,
  gross_weight     NUMERIC,
  net_weight       NUMERIC,
  price            NUMERIC,
  stock            INT,
  product_type     TEXT,
  image_url        TEXT,
  extra_images     JSONB DEFAULT '[]',
  category_id      TEXT,
  category_name    TEXT,
  tech_specs       JSONB DEFAULT '[]',
  synced_at        TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_combisteel_sku      ON combisteel_products(sku);
CREATE INDEX IF NOT EXISTS idx_combisteel_category ON combisteel_products(category_name);
CREATE INDEX IF NOT EXISTS idx_combisteel_brand    ON combisteel_products(brand);
CREATE INDEX IF NOT EXISTS idx_combisteel_price    ON combisteel_products(price);

ALTER TABLE combisteel_products ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'combisteel_products' AND policyname = 'combisteel_public_read'
  ) THEN
    CREATE POLICY combisteel_public_read ON combisteel_products FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'combisteel_products' AND policyname = 'combisteel_service_write'
  ) THEN
    CREATE POLICY combisteel_service_write ON combisteel_products FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;
