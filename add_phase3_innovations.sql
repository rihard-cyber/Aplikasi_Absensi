-- ============================================================
-- MIGRATION: Phase 3 Innovation Tables
-- File: add_phase3_innovations.sql
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. TABEL ZONA WI-FI (Geofencing Wi-Fi) ─────────────────
CREATE TABLE IF NOT EXISTS tenant_wifi_zones (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  ssid        TEXT NOT NULL,
  bssid       TEXT,
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wifi_zones_ssid_tenant
  ON tenant_wifi_zones (tenant_id, ssid);

ALTER TABLE tenant_wifi_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_admin_wifi_zones" ON tenant_wifi_zones;
CREATE POLICY "tenant_admin_wifi_zones" ON tenant_wifi_zones
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE auth_id = auth.uid()
        AND role IN ('TENANT_ADMIN', 'SUB_ADMIN', 'SUPER_ADMIN')
    )
  );

-- ─── 2. KOLOM SETTING DI TENANT_SETTINGS ────────────────────
ALTER TABLE public.tenant_settings
  ADD COLUMN IF NOT EXISTS wifi_geofence_enabled BOOLEAN DEFAULT FALSE;

-- ─── 3. TABEL WEBHOOK ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_webhooks (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  name               TEXT NOT NULL,
  url                TEXT NOT NULL,
  events             TEXT[] NOT NULL DEFAULT '{}',
  secret             TEXT,
  is_active          BOOLEAN DEFAULT TRUE NOT NULL,
  last_triggered_at  TIMESTAMPTZ,
  last_status        INTEGER,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tenant_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_admin_webhooks" ON tenant_webhooks;
CREATE POLICY "tenant_admin_webhooks" ON tenant_webhooks
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE auth_id = auth.uid()
        AND role IN ('TENANT_ADMIN', 'SUB_ADMIN', 'SUPER_ADMIN')
    )
  );

-- ─── 4. TABEL WEBHOOK LOGS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id      UUID REFERENCES tenant_webhooks(id) ON DELETE CASCADE,
  event           TEXT NOT NULL,
  payload         JSONB,
  response_status INTEGER,
  response_body   TEXT,
  triggered_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id
  ON webhook_logs (webhook_id, triggered_at DESC);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_admin_webhook_logs_read" ON webhook_logs;
CREATE POLICY "tenant_admin_webhook_logs_read" ON webhook_logs
  FOR SELECT USING (
    webhook_id IN (
      SELECT id FROM tenant_webhooks
      WHERE tenant_id IN (
        SELECT tenant_id FROM profiles
        WHERE auth_id = auth.uid()
          AND role IN ('TENANT_ADMIN', 'SUB_ADMIN', 'SUPER_ADMIN')
      )
    )
  );

DROP POLICY IF EXISTS "service_insert_webhook_logs" ON webhook_logs;
CREATE POLICY "service_insert_webhook_logs" ON webhook_logs
  FOR INSERT WITH CHECK (true);

-- ─── VERIFIKASI ──────────────────────────────────────────────
SELECT 'tenant_wifi_zones' AS table_name, COUNT(*) AS rows FROM tenant_wifi_zones
UNION ALL
SELECT 'tenant_webhooks'   AS table_name, COUNT(*) AS rows FROM tenant_webhooks
UNION ALL
SELECT 'webhook_logs'      AS table_name, COUNT(*) AS rows FROM webhook_logs;
