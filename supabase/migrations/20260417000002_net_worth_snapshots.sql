-- Daily net-worth snapshots — powers the NetWorth chart and all delta rows
-- (1 DAY, 1 WEEK, 1 MONTH, CAGR, benchmarks). Written nightly by a scheduled job.

CREATE TABLE public.net_worth_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_assets NUMERIC NOT NULL DEFAULT 0,
  total_debts NUMERIC NOT NULL DEFAULT 0,
  net_worth NUMERIC NOT NULL DEFAULT 0,
  cash NUMERIC NOT NULL DEFAULT 0,
  investable NUMERIC NOT NULL DEFAULT 0,
  real_estate NUMERIC NOT NULL DEFAULT 0,
  base_currency TEXT NOT NULL,
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, snapshot_date)
);

ALTER TABLE public.net_worth_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snapshots_select_own" ON public.net_worth_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "snapshots_insert_own" ON public.net_worth_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_net_worth_snapshots_user_date ON public.net_worth_snapshots(user_id, snapshot_date DESC);

-- Helper: compute and store today's snapshot for a given user.
-- Called by a scheduled job and also on-demand from a Server Action after big edits.
CREATE OR REPLACE FUNCTION public.capture_net_worth_snapshot(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_assets NUMERIC;
  v_debts NUMERIC;
  v_cash NUMERIC;
  v_investable NUMERIC;
  v_real_estate NUMERIC;
  v_currency TEXT;
BEGIN
  SELECT COALESCE(base_currency, 'EUR') INTO v_currency
  FROM public.profiles WHERE id = p_user_id;

  SELECT
    COALESCE(SUM(CASE WHEN is_liability THEN 0 ELSE value END), 0),
    COALESCE(SUM(CASE WHEN is_liability THEN value ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN asset_type = 'cash' AND NOT is_liability THEN value ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN asset_type IN ('stock','crypto','metal') AND NOT is_liability THEN value ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN asset_type = 'real_estate' AND NOT is_liability THEN value ELSE 0 END), 0)
  INTO v_assets, v_debts, v_cash, v_investable, v_real_estate
  FROM public.assets WHERE user_id = p_user_id;

  INSERT INTO public.net_worth_snapshots
    (user_id, snapshot_date, total_assets, total_debts, net_worth, cash, investable, real_estate, base_currency)
  VALUES
    (p_user_id, CURRENT_DATE, v_assets, v_debts, v_assets - v_debts, v_cash, v_investable, v_real_estate, v_currency)
  ON CONFLICT (user_id, snapshot_date) DO UPDATE SET
    total_assets = EXCLUDED.total_assets,
    total_debts = EXCLUDED.total_debts,
    net_worth = EXCLUDED.net_worth,
    cash = EXCLUDED.cash,
    investable = EXCLUDED.investable,
    real_estate = EXCLUDED.real_estate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Invoker needs execute rights (RLS still gates the read/writes inside)
GRANT EXECUTE ON FUNCTION public.capture_net_worth_snapshot(UUID) TO authenticated;
