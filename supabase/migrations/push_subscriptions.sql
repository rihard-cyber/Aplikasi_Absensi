-- Push Subscriptions Table
-- Simpan endpoint Web Push per karyawan untuk pengiriman notifikasi server-side
-- 
-- Jalankan SQL ini di Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → Paste dan Run

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT,       -- Public key untuk enkripsi payload
  auth TEXT,         -- Auth secret untuk enkripsi payload
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id)   -- Satu subscription per user (upsert akan update jika berubah)
);

-- RLS: Karyawan hanya bisa read/write subscription milik sendiri
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscription" ON push_subscriptions
  FOR ALL USING (
    user_id IN (
      SELECT id FROM profiles WHERE auth_id = auth.uid()
    )
  );

-- Admin tenant bisa read semua subscription di tenant-nya (untuk kirim notifikasi)
CREATE POLICY "Tenant admin can read subscriptions" ON push_subscriptions
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles 
      WHERE auth_id = auth.uid() 
      AND role IN ('TENANT_ADMIN', 'SUB_ADMIN')
    )
  );

-- Index untuk query cepat per tenant
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_tenant ON push_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
