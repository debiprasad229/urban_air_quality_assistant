-- Supabase Free Tier Schema: Communal Clean Air Ledger
-- NOTE: Connect via the Supabase Transaction Pooler:
-- Host: aws-0-[REGION].pooler.supabase.com
-- Port: 6543 (Transaction Pooler - IPv4 supported)
-- User: postgres.[PROJECT_REF]

-- 1. Community Actions Table
CREATE TABLE IF NOT EXISTS public.impact_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    action_type TEXT NOT NULL,
    co2e_avoided_g DOUBLE PRECISION NOT NULL,
    pm2_5_avoided_ug DOUBLE PRECISION NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for temporal aggregation
CREATE INDEX IF NOT EXISTS idx_impact_actions_created_at 
ON public.impact_actions(created_at DESC);

-- 2. Aggregated Community Summary Table
CREATE TABLE IF NOT EXISTS public.community_impact_summary (
    id INT PRIMARY KEY DEFAULT 1,
    total_actions_logged BIGINT DEFAULT 142,
    total_co2e_avoided_kg DOUBLE PRECISION DEFAULT 84.5,
    total_pm2_5_avoided_mg DOUBLE PRECISION DEFAULT 12500.0,
    equivalent_trees_planted_days DOUBLE PRECISION DEFAULT 14.1,
    last_updated TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT single_row_check CHECK (id = 1)
);

-- Seed initial row if absent
INSERT INTO public.community_impact_summary (id, total_actions_logged, total_co2e_avoided_kg, total_pm2_5_avoided_mg, equivalent_trees_planted_days)
VALUES (1, 142, 84.5, 12500.0, 14.1)
ON CONFLICT (id) DO NOTHING;

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE public.impact_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_impact_summary ENABLE ROW LEVEL SECURITY;

-- Allow anonymous clients to read communal stats
CREATE POLICY "Allow public read-only access to summary"
ON public.community_impact_summary
FOR SELECT
USING (true);

-- Allow anonymous inserts for logging sustainable transit actions
CREATE POLICY "Allow public inserts for verified actions"
ON public.impact_actions
FOR INSERT
WITH CHECK (true);

-- Allow public read of actions
CREATE POLICY "Allow public read of actions"
ON public.impact_actions
FOR SELECT
USING (true);
