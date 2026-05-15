-- ==============================================================================
-- FINAL: System Configs
-- ==============================================================================

CREATE TABLE public.system_configs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_sender_name VARCHAR(255) DEFAULT 'SI PRESENSI',
  email_sender_address VARCHAR(255),
  email_provider VARCHAR(50) DEFAULT 'smtp' CHECK (email_provider IN ('smtp', 'sendgrid', 'mailgun')),
  smtp_host VARCHAR(255),
  smtp_port INT DEFAULT 587,
  smtp_username VARCHAR(255),
  smtp_password TEXT,
  smtp_encryption VARCHAR(20) DEFAULT 'tls',
  whatsapp_api_key TEXT,
  whatsapp_api_url TEXT,
  webhook_url TEXT,
  webhook_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Isolasi Tenant - System Configs" ON public.system_configs
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
