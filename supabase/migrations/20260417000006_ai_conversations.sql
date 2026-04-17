-- AI Assistant chat history. Messages stored as JSONB array per conversation.

CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aic_select_own" ON public.ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "aic_insert_own" ON public.ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "aic_update_own" ON public.ai_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "aic_delete_own" ON public.ai_conversations FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_aic_user_updated ON public.ai_conversations(user_id, updated_at DESC);

CREATE TABLE public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cached_tokens INTEGER,
  model TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aim_select_own" ON public.ai_messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "aim_insert_own" ON public.ai_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_aim_conv_created ON public.ai_messages(conversation_id, created_at);
