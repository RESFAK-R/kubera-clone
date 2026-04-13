-- Enable Row Level Security
ALTER TABLE auth.users REPLICA IDENTITY FULL;

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  base_currency TEXT DEFAULT 'USD' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Portfolios table
CREATE TABLE public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own portfolios" ON public.portfolios
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own portfolios" ON public.portfolios
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios" ON public.portfolios
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios" ON public.portfolios
  FOR DELETE USING (auth.uid() = user_id);

-- Assets table
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL, -- 'cash', 'crypto', 'stock', 'real_estate', 'metal', 'other'
  value NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assets" ON public.assets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assets" ON public.assets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets" ON public.assets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets" ON public.assets
  FOR DELETE USING (auth.uid() = user_id);

-- Asset History table (for charting)
CREATE TABLE public.asset_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.asset_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own asset history" ON public.asset_history
  FOR SELECT USING (auth.uid() = user_id);

-- Function to handle profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  
  -- Create a default portfolio
  INSERT INTO public.portfolios (user_id, name)
  VALUES (new.id, 'My Portfolio');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to handle new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
