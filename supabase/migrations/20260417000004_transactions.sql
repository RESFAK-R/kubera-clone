-- Income/expense ledger. Powers Cash Forecast, Recap history, and tax estimation.
-- Recurring rules generate transaction rows via a scheduled job.

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense', 'transfer', 'buy', 'sell', 'dividend')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  category TEXT,
  description TEXT,
  occurred_at DATE NOT NULL DEFAULT CURRENT_DATE,
  recurring_rule_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tx_select_own" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tx_insert_own" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tx_update_own" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tx_delete_own" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_tx_user_date ON public.transactions(user_id, occurred_at DESC);
CREATE INDEX idx_tx_user_kind ON public.transactions(user_id, kind);

-- Recurring rules are distinct from scenario_rules (which are Fast Forward projections).
-- These actually insert rows into `transactions` each cycle.
CREATE TABLE public.recurring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense', 'transfer')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  category TEXT,
  cadence TEXT NOT NULL CHECK (cadence IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  yearly_bump_pct NUMERIC DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rr_select_own" ON public.recurring_rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rr_insert_own" ON public.recurring_rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rr_update_own" ON public.recurring_rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rr_delete_own" ON public.recurring_rules FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_rr_user_next ON public.recurring_rules(user_id, next_run_date) WHERE enabled = TRUE;

-- Link transactions back to the recurring rule that spawned them.
ALTER TABLE public.transactions
  ADD CONSTRAINT fk_tx_recurring FOREIGN KEY (recurring_rule_id)
  REFERENCES public.recurring_rules(id) ON DELETE SET NULL;
