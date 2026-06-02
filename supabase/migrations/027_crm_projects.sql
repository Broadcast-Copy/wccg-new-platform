-- ============================================================================
-- Migration 027: CRM + Production Orders + Client Assets + Project Manager
-- ============================================================================
-- Sales maintains clients in the CRM, submits production orders (with file
-- attachments) via a form, and uploads client assets to each client's portal.
-- Admin/management runs a Project Manager over the work.
--
-- "Staff" = sales, production, engineering, admin, super_admin, management,
-- role_admin. A client-portal login (crm_clients.portal_user_id) sees only
-- their own client row + orders + assets.

-- Helper predicate inlined in each policy (no SQL function to keep it simple).

-- ─── Clients ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  company         TEXT,
  industry        TEXT,
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  website         TEXT,
  address         TEXT,
  status          TEXT NOT NULL DEFAULT 'lead'
                  CHECK (status IN ('lead','prospect','active','inactive','archived')),
  owner_user_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- sales rep
  portal_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- client login
  portal_email    TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_clients_status ON crm_clients(status);
CREATE INDEX IF NOT EXISTS idx_crm_clients_owner  ON crm_clients(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_crm_clients_portal ON crm_clients(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_crm_clients_search ON crm_clients
  USING GIN (to_tsvector('simple', coalesce(name,'')||' '||coalesce(company,'')||' '||coalesce(contact_name,'')||' '||coalesce(contact_email,'')));

-- ─── Production orders ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS production_orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number    BIGINT GENERATED ALWAYS AS IDENTITY,
  client_id       UUID REFERENCES crm_clients(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'commercial'
                  CHECK (type IN ('commercial','promo','imaging','jingle','voiceover','video','social','other')),
  status          TEXT NOT NULL DEFAULT 'submitted'
                  CHECK (status IN ('submitted','assigned','in_production','review','revisions','approved','delivered','cancelled')),
  priority        TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','rush')),
  brief           TEXT,
  script          TEXT,
  length_seconds  INT,
  budget          NUMERIC(12,2),
  due_date        DATE,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,   -- sales
  assigned_to     UUID REFERENCES auth.users(id) ON DELETE SET NULL,   -- production
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prod_orders_client ON production_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_prod_orders_status ON production_orders(status, created_at DESC);

CREATE TABLE IF NOT EXISTS production_order_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  storage_path  TEXT,
  file_url      TEXT,
  kind          TEXT,
  size_bytes    BIGINT,
  uploaded_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prod_order_files_order ON production_order_files(order_id);

-- ─── Client assets (the client portal contents) ───────────────────────────
CREATE TABLE IF NOT EXISTS client_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES crm_clients(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  kind          TEXT DEFAULT 'file' CHECK (kind IN ('logo','image','audio','video','document','file')),
  storage_path  TEXT,
  file_url      TEXT,
  size_bytes    BIGINT,
  notes         TEXT,
  uploaded_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_client_assets_client ON client_assets(client_id, created_at DESC);

-- ─── Project Manager ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'todo'
                  CHECK (status IN ('backlog','todo','in_progress','blocked','review','done')),
  priority        TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assignee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id       UUID REFERENCES crm_clients(id) ON DELETE SET NULL,
  order_id        UUID REFERENCES production_orders(id) ON DELETE SET NULL,
  due_date        DATE,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status, priority);

CREATE TABLE IF NOT EXISTS project_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  done          BOOLEAN NOT NULL DEFAULT false,
  assignee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date      DATE,
  position      INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON project_tasks(project_id, position);

-- ─── updated_at triggers ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.crm_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DO $$ DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['crm_clients','production_orders','projects'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t||'_touch', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.crm_touch_updated_at()', t||'_touch', t);
  END LOOP;
END $$;

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE crm_clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_order_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_assets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks         ENABLE ROW LEVEL SECURITY;

-- Staff predicate reused below
-- (sales/production/engineering/admin/super_admin/management/role_admin)

-- crm_clients: staff manage; client reads own
DROP POLICY IF EXISTS "Staff manage clients" ON crm_clients;
CREATE POLICY "Staff manage clients" ON crm_clients FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.profile_id=auth.uid() AND ur.role_id IN ('sales','production','engineering','admin','super_admin','management','role_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.profile_id=auth.uid() AND ur.role_id IN ('sales','production','engineering','admin','super_admin','management','role_admin')));
DROP POLICY IF EXISTS "Client reads own record" ON crm_clients;
CREATE POLICY "Client reads own record" ON crm_clients FOR SELECT TO authenticated USING (portal_user_id = auth.uid());

-- production_orders: staff manage; client reads own client's orders
DROP POLICY IF EXISTS "Staff manage orders" ON production_orders;
CREATE POLICY "Staff manage orders" ON production_orders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.profile_id=auth.uid() AND ur.role_id IN ('sales','production','engineering','admin','super_admin','management','role_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.profile_id=auth.uid() AND ur.role_id IN ('sales','production','engineering','admin','super_admin','management','role_admin')));
DROP POLICY IF EXISTS "Client reads own orders" ON production_orders;
CREATE POLICY "Client reads own orders" ON production_orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM crm_clients c WHERE c.id = production_orders.client_id AND c.portal_user_id = auth.uid()));

-- order files: follow the order
DROP POLICY IF EXISTS "Staff manage order files" ON production_order_files;
CREATE POLICY "Staff manage order files" ON production_order_files FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.profile_id=auth.uid() AND ur.role_id IN ('sales','production','engineering','admin','super_admin','management','role_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.profile_id=auth.uid() AND ur.role_id IN ('sales','production','engineering','admin','super_admin','management','role_admin')));
DROP POLICY IF EXISTS "Client reads own order files" ON production_order_files;
CREATE POLICY "Client reads own order files" ON production_order_files FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM production_orders o JOIN crm_clients c ON c.id=o.client_id WHERE o.id=production_order_files.order_id AND c.portal_user_id=auth.uid()));

-- client_assets: staff manage; client reads + uploads own
DROP POLICY IF EXISTS "Staff manage client assets" ON client_assets;
CREATE POLICY "Staff manage client assets" ON client_assets FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.profile_id=auth.uid() AND ur.role_id IN ('sales','production','engineering','admin','super_admin','management','role_admin')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.profile_id=auth.uid() AND ur.role_id IN ('sales','production','engineering','admin','super_admin','management','role_admin')));
DROP POLICY IF EXISTS "Client reads own assets" ON client_assets;
CREATE POLICY "Client reads own assets" ON client_assets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM crm_clients c WHERE c.id=client_assets.client_id AND c.portal_user_id=auth.uid()));
DROP POLICY IF EXISTS "Client uploads own assets" ON client_assets;
CREATE POLICY "Client uploads own assets" ON client_assets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM crm_clients c WHERE c.id=client_assets.client_id AND c.portal_user_id=auth.uid()));

-- projects + tasks: staff only
DROP POLICY IF EXISTS "Staff manage projects" ON projects;
CREATE POLICY "Staff manage projects" ON projects FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.profile_id=auth.uid() AND ur.role_id IN ('sales','production','engineering','admin','super_admin','management','role_admin','promotions')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.profile_id=auth.uid() AND ur.role_id IN ('sales','production','engineering','admin','super_admin','management','role_admin','promotions')));
DROP POLICY IF EXISTS "Staff manage project tasks" ON project_tasks;
CREATE POLICY "Staff manage project tasks" ON project_tasks FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.profile_id=auth.uid() AND ur.role_id IN ('sales','production','engineering','admin','super_admin','management','role_admin','promotions')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.profile_id=auth.uid() AND ur.role_id IN ('sales','production','engineering','admin','super_admin','management','role_admin','promotions')));
