-- P0 FIX: add missing columns that actions.ts and all dashboard pages reference
-- Without these, inserts silently drop sheet/section and every spreadsheet view breaks.

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS sheet TEXT,
  ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'General',
  ADD COLUMN IF NOT EXISTS cost_basis NUMERIC,
  ADD COLUMN IF NOT EXISTS ticker TEXT,
  ADD COLUMN IF NOT EXISTS quantity NUMERIC,
  ADD COLUMN IF NOT EXISTS is_liability BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS last_priced_at TIMESTAMPTZ;

-- Backfill is_liability for existing rows whose type signals a debt
UPDATE public.assets
SET is_liability = TRUE
WHERE asset_type = 'liability' OR sheet = 'Debts';

-- Backfill sheet for rows that don't have one yet, using asset_type as a sensible default
UPDATE public.assets
SET sheet = CASE
  WHEN asset_type = 'cash' THEN 'Cash & Cards'
  WHEN asset_type = 'stock' THEN 'Investments'
  WHEN asset_type = 'crypto' THEN 'Investments'
  WHEN asset_type = 'metal' THEN 'Investments'
  WHEN asset_type = 'real_estate' THEN 'Real Estate'
  WHEN asset_type = 'liability' THEN 'Debts'
  ELSE 'Others'
END
WHERE sheet IS NULL;

CREATE INDEX IF NOT EXISTS idx_assets_user_sheet ON public.assets(user_id, sheet);
CREATE INDEX IF NOT EXISTS idx_assets_user_liability ON public.assets(user_id, is_liability);
CREATE INDEX IF NOT EXISTS idx_assets_ticker ON public.assets(ticker) WHERE ticker IS NOT NULL;
