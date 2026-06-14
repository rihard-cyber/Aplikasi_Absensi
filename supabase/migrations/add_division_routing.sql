-- ==============================================================================
-- MIGRATION: Add Division Routing Columns
-- ==============================================================================

-- Add division_id columns if they do not exist
ALTER TABLE public.helpdesk_tickets ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL;
ALTER TABLE public.incident_reports ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL;
ALTER TABLE public.patrol_incidents ADD COLUMN IF NOT EXISTS division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL;
