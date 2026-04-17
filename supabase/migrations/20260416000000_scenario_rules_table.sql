-- Create scenario_rules table for storing rule configurations
CREATE TABLE public.scenario_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('cash', 'investable', 'income', 'expense', 'inflation')),
  enabled BOOLEAN DEFAULT TRUE NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, rule_type)
);

-- Enable Row Level Security
ALTER TABLE public.scenario_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only view/edit their own rules
CREATE POLICY "Users can view their own scenario rules" ON public.scenario_rules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scenario rules" ON public.scenario_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scenario rules" ON public.scenario_rules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scenario rules" ON public.scenario_rules
  FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_scenario_rules_user_id ON public.scenario_rules(user_id);
