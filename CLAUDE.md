# Kubera Clone — Production Spec

Net-worth tracker that aims for feature parity with [kubera.com](https://www.kubera.com). Kubera costs €249/yr because **every value is dynamic**: live prices, live FX, historical snapshots, IRR vs benchmarks, projections, estate planning. This clone must hit the same bar.

**Non-negotiables** (user-enforced, do not violate):
1. **No static/demo values.** Every number shown comes from the DB or a live feed. Inputs in tables and modals must be editable and persisted.
2. **Screenshots in `/screenshots/` are pixel-source-of-truth.** Before editing any `dashboard/*` UI, open the matching PNG and match spacing, typography, colors, and interaction.
3. **"Print" = generate + save a PDF** (jsPDF). Never `window.print()`.

---

## Tech Stack

- **Framework:** Next.js 16.2 (App Router, RSC + Server Actions), React 19.2, TypeScript strict.
- **UI:** Tailwind v4, shadcn (via `@base-ui/react`), Lucide icons, framer-motion.
- **Charts:** Recharts 3.
- **PDF:** jsPDF + jspdf-autotable.
- **Backend:** Supabase (self-hosted via Docker in `supabase-docker/`), Postgres, RLS everywhere.
- **Auth:** `@supabase/ssr`.
- **Validation:** Zod 4.
- **AI Assistant:** Anthropic SDK (`claude-sonnet-4-6` for chat, `claude-haiku-4-5` for cheap classifications).
- **External data:**
  - Stocks/ETFs: Polygon.io (or Yahoo Finance unofficial).
  - Crypto: CoinGecko public API.
  - FX: exchangerate.host (free) or openexchangerates.
  - Real estate: manual (Zillow is US-only and gated) — leave a `valuation_url` field for future scraping.

---

## Architecture

- **Reads:** React Server Components load data directly from Supabase at the page level. No client-side fetching unless a control needs interactive refetching.
- **Writes:** Server Actions only (`'use server'`). Return `{ success } | { error: string }`. Always `revalidatePath('/dashboard/*')` after mutation.
- **Auth:** Every Server Action calls `supabase.auth.getUser()` and returns `Unauthorized` if null. RLS is the second line of defense, not the first.
- **No `any`:** Use Zod schemas for all DB row types and inputs. Generate types from Zod with `z.infer`.
- **Errors:** `try/catch` in Server Actions. UI surfaces errors via `useActionState` or toast.
- **State:** Local `useState` for UI, Server Actions for persistence. Do not add Zustand/React Query unless a specific case requires it.
- **Scheduled jobs:** Supabase `pg_cron` for: nightly net-worth snapshot, daily ticker refresh, Life Beat check. Scheduled via migrations.

---

## Database Schema (target)

All tables have `user_id UUID` + RLS policies `USING (auth.uid() = user_id)` for SELECT/INSERT/UPDATE/DELETE. All have `created_at`, `updated_at`.

| Table                     | Purpose                                                                  | Status |
|---------------------------|--------------------------------------------------------------------------|--------|
| `profiles`                | auth.users extension, email, full_name, base_currency                    | ✅ exists |
| `user_financial_profile`  | baseline net worth, onboarding flag, preferred currency                  | ✅ exists |
| `portfolios`              | user has many (default auto-seeded on signup)                            | ✅ exists |
| `assets`                  | rows in the spreadsheet — add `sheet TEXT`, `section TEXT`, `cost_basis NUMERIC`, `ticker TEXT`, `quantity NUMERIC`, `is_liability BOOLEAN`, `sort_order INT` | ⚠️ missing cols |
| `asset_history`           | per-asset value over time (from manual edits + ticker refresh)           | ✅ exists |
| `net_worth_snapshots`     | daily total net worth per user (pg_cron job)                             | ❌ TODO |
| `sheets`                  | user-defined sheets/sections with sort order and type (asset/debt)       | ❌ TODO |
| `transactions`            | income/expense ledger (salary, recurring, one-offs)                      | ❌ TODO |
| `recurring_rules`         | generates transactions on schedule (monthly salary, yearly bumps)        | ❌ TODO |
| `scenario_rules`          | Fast Forward rules (cash/investable/income/expense/inflation)            | ✅ exists |
| `tickers_cache`           | last-known price/FX per symbol, TTL-based refresh                        | ❌ TODO |
| `fx_rates`                | base→quote conversion rates, daily                                       | ❌ TODO |
| `beneficiaries`           | name/email/role (primary/secondary/trusted_angel)                        | ❌ TODO |
| `life_beat_state`         | last_active_at, check_interval_days (default 45), last_notified_at       | ❌ TODO |
| `documents`               | Safe Deposit Box: title, storage_path (Supabase Storage), encrypted flag | ❌ TODO |
| `ai_conversations`        | AI Assistant chat history, per user                                      | ❌ TODO |

**Trigger:** `handle_new_user` on `auth.users` must seed: `profiles`, default `portfolio`, `user_financial_profile`, default `sheets` (Cash, Investable, Real Estate, Debts), default `life_beat_state`, default `scenario_rules` (5 rows).

---

## Pages & Routes

All under `src/app/dashboard/`. Sidebar in `layout.tsx` shows dynamic totals computed server-side.

| Route               | Server Component       | Client Component                | Status |
|---------------------|------------------------|---------------------------------|--------|
| `/dashboard`        | redirect → `/networth` |                                 | ✅ |
| `/networth`         | `networth/page.tsx`    | `NetWorthContent` (TODO)        | ⚠️ hardcoded deltas + benchmarks |
| `/assets`           | `assets/page.tsx`      | `AssetSpreadsheet`              | ⚠️ needs sheet/section cols |
| `/debts`            | `debts/page.tsx`       | `DebtsContent`                  | ✅ |
| `/fast-forward`     | `fast-forward/page.tsx`| `FastForwardContent`            | ✅ |
| `/recap`            | `recap/page.tsx`       | `RecapCharts`                   | ⚠️ missing IRR + benchmarks |
| `/beneficiary`      | `beneficiary/page.tsx` | (UI only, no persistence)       | ❌ stub |
| `/ai-assistant`     | `ai-assistant/page.tsx`| (UI only, no handler)           | ❌ stub |

### NetWorth (`/dashboard/networth`)
- Hero: big `€XXX` total net worth, today's delta (€ + %) from last snapshot.
- Chart: line chart of `net_worth_snapshots` over 1W/1M/3M/6M/1Y/ALL. No placeholder SVG.
- Benchmarks row: S&P 500, BTC, AAPL performance over same period — fetched from `tickers_cache`.
- Breakdown cards: Investable Assets, Real Estate, Cash, Debts. Each with delta.

### Assets (`/dashboard/assets`)
- Tabs = `sheets` rows (user-editable, reorderable, renameable, deletable).
- Each tab shows asset rows grouped by `section` inside the tab.
- Spreadsheet columns: Name, Ticker/Details, Quantity, Price, Value, Cost Basis, IRR, Change (24h).
- Rows are editable inline. Auto-save via Server Action on blur/Enter.
- `+ ADD ASSET` opens `AddAssetGridModal` with category tiles (Cash, Stocks, Crypto, Real Estate, Metals, Vehicles, Other). Each category opens a typed form.
- Row hover reveals `⋮` → Delete / Move to sheet / Archive.
- For tickerized rows, Value = quantity × live price (pulled from `tickers_cache`).

### Debts (`/dashboard/debts`) — see spec below
- Filters `assets WHERE is_liability = true`.
- Same tab-per-sheet pattern as Assets, but only for liability sheets.

### Fast Forward (`/dashboard/fast-forward`) — see detailed spec below
- Three tabs: Projections | Charts | Cash Forecast.
- Rules stored in `scenario_rules`.
- Projection engine in `FastForwardContent.tsx`.

### Recap (`/dashboard/recap`)
- Top: total NW + change over period.
- Allocation pie: by asset class (Cash / Investable / Real Estate / Other).
- Allocation by currency, sector (for stocks), region.
- IRR per asset + portfolio total, driven by `cost_basis` + `asset_history`.
- Benchmark comparison: your IRR vs S&P 500, Vanguard VT, BTC, AAPL over same period.
- Top gainers/losers list (30d).

### Beneficiary (`/dashboard/beneficiary`)
- Add/edit primary beneficiary + secondary + trusted angel.
- Life Beat config: check interval (15/30/45/60 days), current timer status.
- Button "I'm OK" to reset timer.
- On Life Beat expiry → server job generates ZIP export (JSON of all assets + PDF summary + uploaded documents) and emails beneficiary with signed URL valid 90 days.

### AI Assistant (`/dashboard/ai-assistant`)
- Chat UI with message history per user (`ai_conversations`).
- Server Action calls Anthropic SDK with context = user's current assets/debts/rules (summarized, cached 5min).
- Example queries: "Can I afford a €500k house in 5 years?", "What's my crypto exposure?".
- Use prompt caching on the system prompt with user's financial context.

---

## Fast Forward Spec (detailed)

Three tabs sharing `scenario_rules` state (toggling a rule updates all tabs).

### 1. NET WORTH PROJECTIONS (default)
- **01 MONTH / 01 YEAR** cards (2-col grid): Net Worth + delta € and %, Assets/Debts row, Income/Expenses/Estimated Tax row.
- **05Y / 10Y / 20Y** mini-cards (3-col): `05Y 2031` label, compact `€ 1,00 Million`, delta.
- **Scenario A** section: purple left-border label + compact total. `+` button to add more scenarios (future).
- **Rules list** (editable, each with toggle + overflow menu):
  - `Value of Cash to change by X% per year`
  - `Value of Investable Assets to change by X% per year`
  - `Income of EUR X from Salary. Repeats every month. Revised to +X% every year in Jan`
  - `Expense of EUR X towards Expenses. Repeats every month`
  - `Inflation rate is X% per year`
- `ADD RULE` button.

### 2. CHARTS
- Header: projected NW at 10Y (e.g. `Apr 2036 — €1,633 Million` + green delta).
- `NET WORTH` label top-right, purple line chart (Recharts).
- Same Scenario A + Rules block underneath (shared state).

### 3. CASH FORECAST
- Editable monthly ledger, max 1 year horizon.
- Period header dropdown: `1 Month`, `This Quarter`, `3 Months`, `This Year`, `1 Year`.
- Summary row: `OPENING + INFLOW − OUTFLOW = CLOSING`.
- Print icon → jsPDF (client-side download) + Server Action `saveCashForecastPdf` writes to `/screenshots/`. NEVER `window.print()`.
- Columns: `Date | Description | Inflow | Outflow | Balance`.
- Opening row (not editable) + per-month auto-seeded rows from enabled rules + Closing row + `+ ADD ROW` + custom rows.
- Footer bar `#6b6b6b` with column totals.

### Projection Details Modal
Clicking any of the 5 projection cards opens a centered modal with backdrop blur.
- Header: end date + relative label (`Next Month`, `In 5 Years`, …).
- Hero: purple left-bar + projected NW + green delta.
- Collapsible **Cash** group (rows for each enabled rule + group total).
- Collapsible **Investable Assets** group (`as of today` + growth + total).
- **Total Assets** summary row + **Total Debts** card.
- Close via × or backdrop click.
- `computeBreakdown(months)` in `FastForwardContent.tsx` returns all aggregates.

### Projection engine
Monthly compounding on investable + cash; net monthly flow (income − expenses); yearly income bump every 12 months. Driven by rule values.

---

## Debts Spec (detailed)

- Large `€XXXX` total + `1 DAY €0` subline from snapshots diff.
- Tabs per sheet with subtotal + `⋮` overflow (rename / delete).
- Table: `DEBT | BALANCE`. Row hover reveals `AlignJustify` + `⋮`.
- `+ ADD DEBT` (`#595959` button) → `AddDebtModal` with tiles (LOANS & MORTGAGE, CREDIT CARDS, manual link).
- `+ NEW SECTION` text link → inline input.

---

## Key Directories

- `src/app/` — App Router routes.
- `src/app/dashboard/actions.ts` — shared Server Actions (assets CRUD).
- `src/app/dashboard/fast-forward/rules-actions.ts` — scenario rules CRUD.
- `src/components/dashboard/` — client components, one per page.
- `src/lib/supabase/` — server + browser clients.
- `src/lib/ruleEngine.ts`, `ruleDefaults.ts`, `ruleValidation.ts` — Fast Forward engine.
- `src/hooks/` — custom React hooks.
- `src/types/` — TypeScript types generated from Zod schemas.
- `supabase/migrations/` — timestamped SQL files, one purpose each.
- `screenshots/` — design source of truth (captured from app.kubera.com).

---

## Code Standards

- **No `any`.** Strict TypeScript everywhere. Prefer inferred types from Zod over hand-written interfaces.
- **Functional components only.** Hooks over classes. One component per file, kebab-case filenames, PascalCase exports.
- **Naming:** components `PascalCase`, vars/fns `camelCase`, files `kebab-case.tsx`, DB `snake_case`.
- **Error handling:** try/catch in Server Actions; never throw from a Server Action — return `{ error: string }`.
- **Accessibility:** ARIA labels on interactive elements; use shadcn primitives when possible.
- **Comments:** default to zero. Only add when the *why* is non-obvious (hidden invariant, workaround). Never explain *what* the code does.
- **No backwards-compat shims.** If deleted, delete it. Don't re-export or leave `// removed` comments.
- **Currency formatting:** use `Intl.NumberFormat` with user's base_currency, locale `en-US` (or `it-IT` — pick one and stick with it; UI uses `€1.234,56` with `.` as thousand separator in the screenshots).

---

## Performance

- Cache expensive RSC queries with Next.js `unstable_cache` keyed by user_id + query params.
- Ticker/FX reads always go through `tickers_cache` / `fx_rates`, never direct to external API at request time.
- Scheduled jobs run via Supabase `pg_cron` → Supabase Edge Function or Next.js Route Handler with secret.
- Skeleton `loading.tsx` for every heavy page.

---

## Current Production Status (2026-04-17)

**Shipped and working:**
- Auth, sidebar nav with dynamic totals, Fast Forward all 3 tabs, scenario rules persistence, Cash Forecast editable ledger + PDF export, Assets spreadsheet (basic), Debts page layout, Recap charts (asset class breakdown).

**Broken / silently failing:**
- `assets.sheet` and `assets.section` columns are referenced by `actions.ts` but do not exist in the migration → inserts fail silently for those fields.
- `handle_new_user` trigger does not seed `user_financial_profile`, `scenario_rules` defaults, or default sheets.
- NetWorth page has hardcoded delta/benchmarks; chart is a placeholder SVG.
- Beneficiary and AI Assistant pages have no persistence or handler.

**Not yet built:**
- `net_worth_snapshots`, `sheets`, `transactions`, `recurring_rules`, `tickers_cache`, `fx_rates`, `beneficiaries`, `life_beat_state`, `documents`, `ai_conversations` tables.
- Market data service + scheduled refresh.
- IRR computation.
- Multi-currency display conversion.
- Safe Deposit Box file upload.
- Life Beat scheduler.
- AI Assistant backend.

---

## Production Roadmap

Each phase is independently shippable.

- **P0 — Schema fix (blocking).** Add missing columns on `assets`, create `sheets` and `net_worth_snapshots` tables, fix `handle_new_user` trigger. Verify existing flows don't regress.
- **P1 — Historical tracking.** `net_worth_snapshots` + pg_cron nightly job. Wire NetWorth chart + breakdowns to real snapshots.
- **P2 — Market data.** `tickers_cache` + fetch worker (CoinGecko for crypto, Polygon for stocks). Apply to `assets.value` for tickerized rows.
- **P3 — Multi-currency.** `fx_rates` + display conversion helper. Respect `base_currency`.
- **P4 — Transactions ledger.** `transactions` + `recurring_rules` tables. UI for adding income/expense. Wire Cash Forecast to real history.
- **P5 — Recap v2.** IRR computation (cost_basis + asset_history + transactions). Benchmark comparison rows.
- **P6 — Beneficiary.** CRUD + `life_beat_state`. Scheduled Life Beat check.
- **P7 — Safe Deposit Box.** Supabase Storage + `documents` table + upload UI.
- **P8 — AI Assistant.** Anthropic SDK + `ai_conversations` table + chat UI. Prompt caching on user context.
- **P9 — Polish.** Mobile responsive, dark mode, accessibility audit, perf tuning.

---

## What NOT to do

- Do **not** hardcode any financial number in a component. If you need a default, read it from `user_financial_profile` or `scenario_rules`.
- Do **not** `window.print()`. Printer icons generate and save PDFs.
- Do **not** modify `dashboard/*` UI without first opening the matching screenshot.
- Do **not** invent new tables — extend the list above and append a migration.
- Do **not** skip RLS on any new table.
- Do **not** call external APIs (Polygon/CoinGecko/FX) at request time. Always go through the cache tables.
