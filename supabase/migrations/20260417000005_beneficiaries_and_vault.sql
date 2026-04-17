-- Estate planning: beneficiaries, Life Beat (dead man switch), Safe Deposit Box documents.
-- Mirrors Kubera's estate planning bundle.

-- Beneficiaries: primary + secondary + trusted_angel.
CREATE TABLE public.beneficiaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('primary', 'secondary', 'trusted_angel')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  relationship TEXT,
  notes TEXT,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ben_select_own" ON public.beneficiaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ben_insert_own" ON public.beneficiaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ben_update_own" ON public.beneficiaries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ben_delete_own" ON public.beneficiaries FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_beneficiaries_user ON public.beneficiaries(user_id);

-- life_beat_state: one row per user. Check interval + last activity.
CREATE TABLE public.life_beat_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  check_interval_days INTEGER NOT NULL DEFAULT 45 CHECK (check_interval_days BETWEEN 7 AND 365),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_checked_at TIMESTAMPTZ,
  notifications_sent INTEGER NOT NULL DEFAULT 0,
  triggered BOOLEAN NOT NULL DEFAULT FALSE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.life_beat_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lb_select_own" ON public.life_beat_state FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "lb_insert_own" ON public.life_beat_state FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "lb_update_own" ON public.life_beat_state FOR UPDATE USING (auth.uid() = user_id);

-- Documents (Safe Deposit Box). File lives in Supabase Storage bucket 'documents'.
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  share_with_beneficiaries BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc_select_own" ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "doc_insert_own" ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "doc_update_own" ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "doc_delete_own" ON public.documents FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_documents_user ON public.documents(user_id);

-- Touch last_active_at whenever a user creates/updates an asset or runs a mutation.
-- Cheap, idempotent. Called from Server Actions.
CREATE OR REPLACE FUNCTION public.touch_life_beat(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.life_beat_state (user_id, last_active_at)
  VALUES (p_user_id, now())
  ON CONFLICT (user_id) DO UPDATE SET
    last_active_at = now(),
    notifications_sent = 0,
    triggered = FALSE,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.touch_life_beat(UUID) TO authenticated;
