-- Sheets: user-editable tabs/groupings in Assets and Debts pages.
-- One row per (user, sheet_name). `kind` distinguishes asset sheets from debt sheets.

CREATE TABLE public.sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('asset', 'debt')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, name, kind)
);

ALTER TABLE public.sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sheets_select_own" ON public.sheets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sheets_insert_own" ON public.sheets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sheets_update_own" ON public.sheets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sheets_delete_own" ON public.sheets FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_sheets_user_kind ON public.sheets(user_id, kind, sort_order);

-- Backfill from existing assets so no user loses their tabs
INSERT INTO public.sheets (user_id, name, kind, sort_order)
SELECT DISTINCT
  user_id,
  COALESCE(sheet, 'Others'),
  CASE WHEN is_liability THEN 'debt' ELSE 'asset' END,
  0
FROM public.assets
WHERE sheet IS NOT NULL
ON CONFLICT DO NOTHING;
