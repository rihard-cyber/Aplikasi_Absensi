-- Notifications Table
-- Menyimpan riwayat notifikasi in-app per user
--
-- Jalankan SQL ini di Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → Paste dan Run

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  actor_name TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- User can read own notifications
CREATE POLICY "Users can read own notifications" ON notifications
  FOR SELECT USING (user_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()));

-- User can mark own notifications as read
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id IN (SELECT id FROM profiles WHERE auth_id = auth.uid()));

-- Service role / Edge Functions can insert
CREATE POLICY "Service role can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
