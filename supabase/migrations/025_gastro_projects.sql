-- ============================================================
-- 025 — gastro_* app-sync tabloları (projeler, aktiviteler, kat planı,
--        sepet, kullanıcı tercihleri, eskizler)
-- ------------------------------------------------------------
-- Bu tablolar yalnızca standalone scripts/migrate-gastro-tables.sql
-- içinde tanımlıydı ve yeni Supabase projesine (vwuqvweorjbqxcebnaym)
-- hiç uygulanmamıştı → uygulamanın localStorage↔Supabase proje senkronu
-- sessizce çalışmıyordu (gastro_projects yok). Bu migration onları
-- IDEMPOTENT (IF NOT EXISTS, DROP yok) şekilde oluşturur; mevcut veriye
-- dokunmaz. RLS = "allow all" (mevcut gastro deseniyle aynı, anon key erişimi).
-- ============================================================

-- 1. gastro_projects (proje meta + products JSONB)
CREATE TABLE IF NOT EXISTS gastro_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'commercial',
  area TEXT DEFAULT '',
  lead TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'drafting',
  progress INTEGER DEFAULT 0,
  client_name TEXT DEFAULT '',
  start_date TEXT DEFAULT '',
  deadline TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  room_width_cm INTEGER DEFAULT 500,
  room_height_cm INTEGER DEFAULT 400,
  products JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gastro_projects_user ON gastro_projects(user_id);

-- 2. gastro_activities
CREATE TABLE IF NOT EXISTS gastro_activities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  activity_time TEXT DEFAULT '',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gastro_activities_user ON gastro_activities(user_id);

-- 3. gastro_floor_plans
CREATE TABLE IF NOT EXISTS gastro_floor_plans (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  project_id TEXT NOT NULL DEFAULT 'global',
  room_width_cm INTEGER DEFAULT 500,
  room_height_cm INTEGER DEFAULT 400,
  room_shape TEXT DEFAULT 'polygon',
  room_polygon JSONB DEFAULT '[]'::jsonb,
  wall_lengths_cm JSONB DEFAULT '[]'::jsonb,
  placed_items JSONB DEFAULT '[]'::jsonb,
  wall_openings JSONB DEFAULT '[]'::jsonb,
  room_props JSONB DEFAULT '{}'::jsonb,
  selected_item_id TEXT,
  canvas_state JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- 4. gastro_cart
CREATE TABLE IF NOT EXISTS gastro_cart (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  product_id TEXT DEFAULT 'unknown',
  product_data JSONB DEFAULT '{}'::jsonb,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gastro_cart_user ON gastro_cart(user_id);

-- 5. gastro_user_prefs
CREATE TABLE IF NOT EXISTS gastro_user_prefs (
  user_id TEXT PRIMARY KEY,
  favorites JSONB DEFAULT '[]'::jsonb,
  notifications JSONB DEFAULT '[]'::jsonb,
  cookie_consent BOOLEAN,
  language TEXT DEFAULT 'tr',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. gastro_sketches
CREATE TABLE IF NOT EXISTS gastro_sketches (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  sketch_id TEXT NOT NULL,
  name TEXT DEFAULT '',
  segments JSONB DEFAULT '[]'::jsonb,
  saved_at BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, sketch_id)
);

-- 7. RLS — allow all (development; mevcut gastro tabloları ile aynı desen)
ALTER TABLE gastro_projects    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastro_activities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastro_floor_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastro_cart        ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastro_user_prefs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastro_sketches    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for gastro_projects"    ON gastro_projects;
DROP POLICY IF EXISTS "Allow all for gastro_activities"  ON gastro_activities;
DROP POLICY IF EXISTS "Allow all for gastro_floor_plans" ON gastro_floor_plans;
DROP POLICY IF EXISTS "Allow all for gastro_cart"        ON gastro_cart;
DROP POLICY IF EXISTS "Allow all for gastro_user_prefs"  ON gastro_user_prefs;
DROP POLICY IF EXISTS "Allow all for gastro_sketches"    ON gastro_sketches;

CREATE POLICY "Allow all for gastro_projects"    ON gastro_projects    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for gastro_activities"  ON gastro_activities  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for gastro_floor_plans" ON gastro_floor_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for gastro_cart"        ON gastro_cart        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for gastro_user_prefs"  ON gastro_user_prefs  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for gastro_sketches"    ON gastro_sketches    FOR ALL USING (true) WITH CHECK (true);

-- 8. updated_at trigger (idempotent)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gastro_projects_updated    ON gastro_projects;
DROP TRIGGER IF EXISTS trg_gastro_floor_plans_updated ON gastro_floor_plans;
DROP TRIGGER IF EXISTS trg_gastro_user_prefs_updated  ON gastro_user_prefs;

CREATE TRIGGER trg_gastro_projects_updated
  BEFORE UPDATE ON gastro_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_gastro_floor_plans_updated
  BEFORE UPDATE ON gastro_floor_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_gastro_user_prefs_updated
  BEFORE UPDATE ON gastro_user_prefs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
