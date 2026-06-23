-- 016_design_projects.sql
-- 3D Tasarım modülü (/3d-design ve /projects/:id/design) için kalıcı saklama.
--
-- SORUN: Yeni 3D Tasarım aracı çizimleri HİÇBİR yere kaydetmiyordu (ne Supabase
-- ne localStorage). Sayfadan giriş/çıkış yapınca kullanıcının çizdiği proje
-- tamamen kayboluyordu. Bu tablo bunu kalıcı olarak çözer.
--
-- Anahtarlama: (user_id, project_key). project_key =
--   • /projects/:id/design  → URL'deki proje id'si (her proje KENDİ tasarımını saklar)
--   • /3d-design (bağımsız)  → 'standalone'
-- Böylece projeler birbirini ezmez. gastro_floor_plans ile aynı desen.
--
-- Model (ProjectDocument) tamamen JSON-serileştirilebilir, bu yüzden tüm belge
-- tek bir JSONB sütununda saklanır. Bu migration idempotent'tir.

CREATE TABLE IF NOT EXISTS gastro_design_projects (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     TEXT NOT NULL DEFAULT 'anonymous',
  project_key TEXT NOT NULL DEFAULT 'standalone',
  name        TEXT NOT NULL DEFAULT 'Untitled Project',
  document    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_key)
);

CREATE INDEX IF NOT EXISTS idx_gastro_design_projects_user
  ON gastro_design_projects (user_id, updated_at DESC);

-- RLS — gastro_* tablolarıyla aynı (anon key ile erişim için "allow all").
ALTER TABLE gastro_design_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for gastro_design_projects" ON gastro_design_projects;
CREATE POLICY "Allow all for gastro_design_projects"
  ON gastro_design_projects FOR ALL USING (true) WITH CHECK (true);

-- updated_at otomatik güncelleme (numaralı migration'lardaki konvansiyon).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gastro_design_projects_updated ON gastro_design_projects;
CREATE TRIGGER trg_gastro_design_projects_updated
  BEFORE UPDATE ON gastro_design_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
