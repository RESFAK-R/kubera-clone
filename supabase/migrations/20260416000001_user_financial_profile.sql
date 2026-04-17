-- Create user_financial_profile table to store user's baseline financial data
CREATE TABLE public.user_financial_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  base_currency TEXT NOT NULL DEFAULT 'EUR' CHECK (base_currency IN ('EUR', 'USD', 'GBP', 'CHF')),
  net_worth_baseline NUMERIC NOT NULL DEFAULT 0 CHECK (net_worth_baseline >= 0),
  profile_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.user_financial_profile ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only view/edit their own profile
CREATE POLICY "Users can view their own profile" ON public.user_financial_profile
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.user_financial_profile
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.user_financial_profile
  FOR UPDATE USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_financial_profile_user_id ON public.user_financial_profile(user_id);
