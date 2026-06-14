-- Enterprise Integration Bridge Migration
-- Purpose: Connect Field Operations (Security, Engineering) with HRIS & Payroll

-- 1. Enhance Document Tracking (Expiry Dates & Essential Flags)
ALTER TABLE public.employee_documents 
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS is_essential BOOLEAN DEFAULT false;

-- 2. Enhance Asset Management (Maintenance & Usage)
ALTER TABLE public.company_assets
ADD COLUMN IF NOT EXISTS maintenance_next_date DATE,
ADD COLUMN IF NOT EXISTS last_condition_report TEXT;

-- 3. Enhance Payroll with Performance Bonuses
ALTER TABLE public.payroll_results
ADD COLUMN IF NOT EXISTS performance_bonus NUMERIC DEFAULT 0;

-- 4. KPI Performance Stored Procedure
-- Aggregates real-time data from multiple modules to calculate a score
CREATE OR REPLACE FUNCTION public.calculate_monthly_performance(p_user_id UUID, p_month_year TEXT)
RETURNS JSONB AS $$
DECLARE
    v_attendance_score NUMERIC;
    v_patrol_score NUMERIC;
    v_work_order_score NUMERIC;
    v_total_score NUMERIC;
    v_result JSONB;
BEGIN
    -- Attendance Score (Ontime percentage)
    SELECT COALESCE(
        (COUNT(*) FILTER (WHERE status = 'ONTIME')::NUMERIC / NULLIF(COUNT(*), 0) * 100), 
        100
    ) INTO v_attendance_score
    FROM public.attendance_logs
    WHERE user_id = p_user_id 
    AND TO_CHAR(timestamp, 'YYYY-MM') = p_month_year;

    -- Patrol Score (Checkpoints cleared)
    -- Target: 50 checkpoints per month (example)
    SELECT COALESCE(
        LEAST((COUNT(*)::NUMERIC / 50.0 * 100), 100),
        0
    ) INTO v_patrol_score
    FROM public.patrol_reports
    WHERE user_id = p_user_id 
    AND TO_CHAR(timestamp, 'YYYY-MM') = p_month_year;

    -- Work Order Score (Completion rate)
    SELECT COALESCE(
        (COUNT(*) FILTER (WHERE status = 'COMPLETED')::NUMERIC / NULLIF(COUNT(*), 0) * 100),
        100
    ) INTO v_work_order_score
    FROM public.work_orders
    WHERE assigned_to = p_user_id 
    AND TO_CHAR(created_at, 'YYYY-MM') = p_month_year;

    -- Final Combined Score (Weighted)
    v_total_score := ROUND((v_attendance_score * 0.4) + (v_patrol_score * 0.3) + (v_work_order_score * 0.3));

    v_result := jsonb_build_object(
        'attendance_score', v_attendance_score,
        'patrol_score', v_patrol_score,
        'work_order_score', v_work_order_score,
        'total_score', v_total_score
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 5. Preventive Maintenance Table
CREATE TABLE IF NOT EXISTS public.preventive_maintenance (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES public.company_assets(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'SCHEDULED', -- SCHEDULED, IN_PROGRESS, COMPLETED, OVERDUE
  performed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.preventive_maintenance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_pm" ON public.preventive_maintenance;
CREATE POLICY "tenant_isolation_pm" ON public.preventive_maintenance 
  FOR ALL USING (tenant_id = get_my_tenant() OR get_my_role() = 'SUPER_ADMIN');

GRANT ALL ON public.preventive_maintenance TO authenticated;

-- Refresh schema
NOTIFY pgrst, 'reload schema';
