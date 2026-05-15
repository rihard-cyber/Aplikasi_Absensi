-- ==============================================================================
-- PAYROLL MODULE v2.0 - FASE 2: Pinjaman, Reimbursement, Cuti, THR
-- Eksekusi setelah add_payroll_tables.sql
-- ==============================================================================

-- [Q] PINJAMAN KARYAWAN
CREATE TABLE public.loans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  installment_count INT NOT NULL DEFAULT 1,
  monthly_deduction NUMERIC(15,2) NOT NULL DEFAULT 0,
  remaining NUMERIC(15,2) NOT NULL,
  purpose VARCHAR(255),
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'PAID', 'REJECTED')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- [R] REIMBURSEMENT / KLAIM
CREATE TABLE public.reimbursements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('MEDICAL', 'TRANSPORT', 'MEAL', 'TRAINING', 'SUPPLIES', 'ENTERTAINMENT', 'OTHER')),
  amount NUMERIC(15,2) NOT NULL,
  description TEXT,
  receipt_url TEXT,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAID')),
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  paid_in_payroll BOOLEAN DEFAULT false,
  period_id UUID REFERENCES public.payroll_periods(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- [S] SALDO CUTI TAHUNAN
CREATE TABLE public.leave_balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  year INT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  total_days INT NOT NULL DEFAULT 12,
  used_days INT NOT NULL DEFAULT 0,
  pending_days INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, year)
);

-- RLS
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;

-- Isolasi Tenant (Admin)
CREATE POLICY "Isolasi Tenant - Loans" ON public.loans
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Isolasi Tenant - Reimbursements" ON public.reimbursements
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');
CREATE POLICY "Isolasi Tenant - Leave Balances" ON public.leave_balances
  FOR ALL USING (tenant_id = public.get_my_tenant() OR public.get_my_role() = 'SUPER_ADMIN');

-- Employee bisa lihat & buat milik sendiri
CREATE POLICY "Employee Loans Own" ON public.loans FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
CREATE POLICY "Employee Insert Loans" ON public.loans FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
CREATE POLICY "Employee Reimbursements Own" ON public.reimbursements FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
CREATE POLICY "Employee Insert Reimbursements" ON public.reimbursements FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));
CREATE POLICY "Employee Leave Balance Own" ON public.leave_balances FOR SELECT
  USING (user_id IN (SELECT id FROM public.profiles WHERE auth_id = auth.uid()));

-- Trigger: auto-create leave_balance setiap tahun
CREATE OR REPLACE FUNCTION public.handle_annual_leave_balance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.leave_balances (tenant_id, user_id, year, total_days)
  VALUES (NEW.tenant_id, NEW.id, EXTRACT(YEAR FROM CURRENT_DATE), 12)
  ON CONFLICT (user_id, year) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_leave
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_annual_leave_balance();

-- Update leave_balance ketika leave request disetujui
CREATE OR REPLACE FUNCTION public.handle_leave_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'APPROVED' AND OLD.status = 'PENDING' AND NEW.type = 'ANNUAL' THEN
    UPDATE public.leave_balances
    SET used_days = used_days + GREATEST(1, (NEW.end_date - NEW.start_date + 1)),
        pending_days = pending_days - GREATEST(1, (NEW.end_date - NEW.start_date + 1))
    WHERE user_id = NEW.user_id AND year = EXTRACT(YEAR FROM NEW.start_date);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_leave_request_approved
  AFTER UPDATE OF status ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_leave_approved();
