-- Market data caches. External APIs (Polygon, CoinGecko, exchangerate.host) are
-- called by a scheduled worker, never at request time. All reads go through these.

-- tickers_cache: one row per (kind, symbol). Shared across all users.
CREATE TABLE public.tickers_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('stock', 'crypto', 'metal', 'index')),
  symbol TEXT NOT NULL,
  name TEXT,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  change_24h NUMERIC,
  change_pct_24h NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(kind, symbol)
);

ALTER TABLE public.tickers_cache ENABLE ROW LEVEL SECURITY;

-- Read-only for all authenticated users (it's a shared cache).
CREATE POLICY "tickers_read_all" ON public.tickers_cache FOR SELECT TO authenticated USING (TRUE);

CREATE INDEX idx_tickers_kind_symbol ON public.tickers_cache(kind, symbol);
CREATE INDEX idx_tickers_fetched_at ON public.tickers_cache(fetched_at);

-- fx_rates: conversion rate at a given date. Always stored as base=EUR.
-- To convert X USD to EUR: X / rate_where_quote=USD.
CREATE TABLE public.fx_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base TEXT NOT NULL,
  quote TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  rate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  fetched_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(base, quote, rate_date)
);

ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fx_read_all" ON public.fx_rates FOR SELECT TO authenticated USING (TRUE);

CREATE INDEX idx_fx_rates_lookup ON public.fx_rates(base, quote, rate_date DESC);

-- Price history per ticker — used by Recap for benchmark comparison charts.
CREATE TABLE public.ticker_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,
  symbol TEXT NOT NULL,
  price NUMERIC NOT NULL,
  price_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(kind, symbol, price_date)
);

ALTER TABLE public.ticker_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticker_history_read_all" ON public.ticker_history FOR SELECT TO authenticated USING (TRUE);

CREATE INDEX idx_ticker_history_lookup ON public.ticker_history(kind, symbol, price_date DESC);
