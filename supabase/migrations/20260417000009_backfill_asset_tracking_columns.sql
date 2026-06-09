-- Backfill tickerized asset columns used by cron refresh and recap.
-- This is intentionally non-destructive: existing top-level values win.

WITH parsed AS (
  SELECT
    id,
    CASE
      WHEN metadata->>'quantity' ~ '^[[:space:]]*-?[0-9]+([.][0-9]+)?[[:space:]]*$'
        THEN (metadata->>'quantity')::numeric
      WHEN metadata->>'qty' ~ '^[[:space:]]*-?[0-9]+([.][0-9]+)?[[:space:]]*$'
        THEN (metadata->>'qty')::numeric
      ELSE NULL
    END AS parsed_quantity
  FROM public.assets
  WHERE asset_type IN ('stock', 'crypto', 'metal')
)
UPDATE public.assets AS a
SET ticker = UPPER(
  REGEXP_REPLACE(
    TRIM(COALESCE(NULLIF(a.metadata->>'ticker', ''), a.name)),
    '^\$',
    ''
  )
)
FROM parsed AS p
WHERE a.id = p.id
  AND a.ticker IS NULL
  AND COALESCE(NULLIF(a.metadata->>'ticker', ''), NULLIF(a.name, '')) IS NOT NULL
  AND (
    NULLIF(a.metadata->>'ticker', '') IS NOT NULL
    OR a.quantity IS NOT NULL
    OR p.parsed_quantity IS NOT NULL
  );

WITH parsed AS (
  SELECT
    id,
    CASE
      WHEN metadata->>'quantity' ~ '^[[:space:]]*-?[0-9]+([.][0-9]+)?[[:space:]]*$'
        THEN (metadata->>'quantity')::numeric
      WHEN metadata->>'qty' ~ '^[[:space:]]*-?[0-9]+([.][0-9]+)?[[:space:]]*$'
        THEN (metadata->>'qty')::numeric
      ELSE NULL
    END AS parsed_quantity
  FROM public.assets
  WHERE asset_type IN ('stock', 'crypto', 'metal')
)
UPDATE public.assets AS a
SET quantity = p.parsed_quantity
FROM parsed AS p
WHERE a.id = p.id
  AND a.quantity IS NULL
  AND p.parsed_quantity IS NOT NULL;

WITH parsed AS (
  SELECT
    id,
    CASE
      WHEN metadata->>'quantity' ~ '^[[:space:]]*-?[0-9]+([.][0-9]+)?[[:space:]]*$'
        THEN (metadata->>'quantity')::numeric
      WHEN metadata->>'qty' ~ '^[[:space:]]*-?[0-9]+([.][0-9]+)?[[:space:]]*$'
        THEN (metadata->>'qty')::numeric
      ELSE NULL
    END AS parsed_quantity,
    CASE
      WHEN metadata->>'cost_basis' ~ '^[[:space:]]*-?[0-9]+([.][0-9]+)?[[:space:]]*$'
        THEN (metadata->>'cost_basis')::numeric
      ELSE NULL
    END AS parsed_cost_basis,
    CASE
      WHEN metadata->>'price_per_unit' ~ '^[[:space:]]*-?[0-9]+([.][0-9]+)?[[:space:]]*$'
        THEN (metadata->>'price_per_unit')::numeric
      ELSE NULL
    END AS parsed_price_per_unit
  FROM public.assets
  WHERE asset_type IN ('stock', 'crypto', 'metal')
)
UPDATE public.assets AS a
SET cost_basis = COALESCE(
  p.parsed_cost_basis,
  COALESCE(a.quantity, p.parsed_quantity) * p.parsed_price_per_unit
)
FROM parsed AS p
WHERE a.id = p.id
  AND a.cost_basis IS NULL
  AND COALESCE(
    p.parsed_cost_basis,
    COALESCE(a.quantity, p.parsed_quantity) * p.parsed_price_per_unit
  ) IS NOT NULL;
