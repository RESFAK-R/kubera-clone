-- Replace handle_new_user so every signup seeds a complete, usable workspace:
-- profile, portfolio, financial_profile, default sheets, default scenario rules, life_beat_state.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_portfolio_id UUID;
BEGIN
  -- Profile row
  INSERT INTO public.profiles (id, email, full_name, base_currency)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', COALESCE(new.raw_user_meta_data->>'base_currency', 'EUR'))
  ON CONFLICT (id) DO NOTHING;

  -- Financial profile (used by NetWorth page, Fast Forward)
  INSERT INTO public.user_financial_profile (user_id, base_currency)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'base_currency', 'EUR'))
  ON CONFLICT (user_id) DO NOTHING;

  -- Default portfolio
  INSERT INTO public.portfolios (user_id, name)
  VALUES (new.id, 'My Portfolio')
  RETURNING id INTO v_portfolio_id;

  -- Default asset sheets (match the Kubera starter)
  INSERT INTO public.sheets (user_id, name, kind, sort_order) VALUES
    (new.id, 'Cash & Cards', 'asset', 0),
    (new.id, 'Investments', 'asset', 1),
    (new.id, 'Real Estate', 'asset', 2),
    (new.id, 'Others', 'asset', 3),
    (new.id, 'Debts', 'debt', 0)
  ON CONFLICT DO NOTHING;

  -- Default Fast Forward scenario rules (all enabled, sensible defaults)
  INSERT INTO public.scenario_rules (user_id, rule_type, enabled, config) VALUES
    (new.id, 'cash',       TRUE, '{"annualRate": 1.5}'::jsonb),
    (new.id, 'investable', TRUE, '{"annualRate": 7.0}'::jsonb),
    (new.id, 'income',     TRUE, '{"amount": 3000, "currency": "EUR", "cadence": "monthly", "yearlyBumpPct": 3}'::jsonb),
    (new.id, 'expense',    TRUE, '{"amount": 1800, "currency": "EUR", "cadence": "monthly"}'::jsonb),
    (new.id, 'inflation',  TRUE, '{"annualRate": 2.5}'::jsonb)
  ON CONFLICT (user_id, rule_type) DO NOTHING;

  -- Life Beat state (dead man switch ready out-of-the-box)
  INSERT INTO public.life_beat_state (user_id) VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger already exists from the core schema migration — replace function only.
