# Project: Kubera Clone (Net Worth Tracker)

## Tech Stack
- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui.
- **Backend:** Supabase (Self-hosted via Docker), Next.js Server Actions.
- **Database:** PostgreSQL (via Supabase).
- **Icons:** Lucide React.
- **Charts:** Recharts or Tremor.

## Architecture
- **State Management:** React Context for global UI state, Zustand for specific store-like needs, React Query for server-state caching if needed beyond RSC.
- **Data Fetching:** Prefer React Server Components (RSC) for initial data fetching. Use Server Actions for mutations.
- **Authentication:** Supabase Auth (SSR package).
- **Security:** Strict Row Level Security (RLS) on all PostgreSQL tables.

## Development Workflow
- **Code Style:** Functional components, hooks-heavy, minimal class-based components.
- **Naming:** PascalCase for components, camelCase for variables/functions, kebab-case for files.
- **Testing:** Vitest for units, Playwright for E2E (Phase 5+).
- **Deployment:** Docker-based (Supabase) + Vercel/Self-hosted (Next.js).

## Key Files & Directories
- `/app`: Next.js App Router.
- `/components`: Shared UI components.
- `/lib`: Utility functions, Supabase client, constants.
- `/supabase`: Docker config, migrations, and seed data.
- `/hooks`: Custom React hooks.
- `/types`: TypeScript definitions.

## Project Rules
- **No `any`**: Use strict typing everywhere.
- **Error Handling:** Use `try/catch` in Server Actions and return standard error objects.
- **Accessibility:** Ensure all UI components follow ARIA standards (shadcn/ui handles most of this).
- **Performance:** Optimize images and use `loading.tsx` skeletons for heavy pages.

## Design Reference
- **Source of truth:** screenshots in `/screenshots/` folder (captured from app.kubera.com).
- Always compare against screenshots before modifying any UI in `/dashboard/*` — match spacing, typography, colors, and interaction patterns exactly.
- If a screenshot is missing for a section you're working on, ask to capture it before implementing.

## Pages & Features

### Fast Forward Page (`/dashboard/fast-forward`)
Net worth projections and financial scenario planning. Replicates Kubera's Fast Forward.

**Three tabs:**

1. **NET WORTH PROJECTIONS** (default)
   - **01 MONTH / 01 YEAR** cards (2-col grid): Net Worth with delta € and %, Assets/Debts row, Income/Expenses/Estimated Tax row.
   - **05Y / 10Y / 20Y** mini-cards (3-col grid): label like `05Y 2031`, compact Net Worth (e.g. `€ 1,00 Million`), delta.
   - **Scenario A** section: purple left-border label with compact total. `+` button to add scenarios.
   - **Rules list** (editable, each with toggle + overflow menu):
     - `Value of Cash to change by X% per year`
     - `Value of Investable Assets to change by X% per year`
     - `Income of EUR X from Salary. Repeats every month. Revised to +X% every year in Jan`
     - `Expense of EUR X towards Expenses. Repeats every month`
     - `Inflation rate is X% per year`
   - `ADD RULE` button at the bottom.

2. **CHARTS** — large header with projected net worth at 10Y (e.g. `Apr 2036 — €1,633 Million` + green delta `+€1,138M (229,93%)`), `NET WORTH` label top-right, purple line chart below (Recharts), then the **same Scenario A + Rules block** as the Projections tab underneath (shared state — toggling a rule updates both tabs).

3. **CASH FORECAST** — **editable** monthly ledger table, max 1 year horizon:
   - Clickable period header `MMM YYYY [- MMM YYYY]` with dropdown: `1 Month`, `This Quarter`, `3 Months`, `This Year`, `1 Year`. No 5/10/20Y options here — Cash Forecast is short-term only.
   - Summary row inline: `OPENING + INFLOW − OUTFLOW = CLOSING` with bold values + operator separators.
   - **Print icon** (right of summary row) — generates a PDF client-side via `jsPDF` + `jspdf-autotable`, mirroring `screenshots/Fast Forward • Kubera.pdf`. The PDF is (a) downloaded to the user's browser and (b) saved server-side under `/screenshots/` via the `saveCashForecastPdf` Server Action. Does NOT use `window.print()`.
   - **Ledger table** columns: `Date | Description | Inflow | Outflow | Balance`.
     - Opening row: `Opening Balance as of today` (not editable).
     - Per-month rows auto-seeded from enabled Scenario A rules: `Salary`, `Cash grows by X% per year`, `Expenses`. Each row has **inline editable inputs** for description, inflow, outflow (stored as per-row overrides — don't mutate Scenario A rules).
     - `Closing Balance` row at the end in bold.
   - `+ ADD ROW` button below table — appends custom editable rows, removable via × icon on hover.
   - Dark gray `#6b6b6b` footer bar with column totals.

#### Projection Details Modal (clicking a card in Projections tab)
Clicking any of the 5 projection cards (01 MONTH, 01 YEAR, 5Y, 10Y, 20Y) opens a centered modal with backdrop blur showing how that projection was computed:
- Header: end date (e.g. `31 May 2026`) + relative label (`Next Month`, `Next Year`, `In 5 Years`, …).
- Hero: purple left-bar + projected net worth + green delta `+€X (X,XX%)`.
- Collapsible **Cash** group: rows for each enabled rule (Salary income, Expenses, Cash growth) with their cumulative contribution to the period, plus group total/delta in the header.
- Collapsible **Investable Assets** group: `as of today` starting value + `Value of Investable Assets to change by X% per year` contribution, plus total.
- **Total Assets** summary row (delta + total).
- **Total Debts** card below (flat value).
- Close via × top-right or click on backdrop.
- Helper `computeBreakdown(months)` in `FastForwardContent.tsx` simulates month-by-month and returns all aggregates.

**Projection engine:** monthly compounding on investable assets + cash with configurable growth rates; monthly net flow (income − expenses) added each month; yearly income bump applied every 12 months. Driven by Scenario A rule values.

**Key files:**
- `src/app/dashboard/fast-forward/page.tsx` — server component, loads profile + assets, computes totals (totalAssets, totalDebts, investableAssets), passes to client. Container max-width `1100px`.
- `src/components/dashboard/FastForwardContent.tsx` — client component with all 3 tabs, projection engine, editable Scenario A rules (shared between Projections & Charts tabs), editable Cash Forecast ledger, PDF export, and `ProjectionDetailsModal`.
- `src/app/dashboard/fast-forward/save-pdf-action.ts` — Server Action that writes the generated PDF buffer to `/screenshots/{filename}.pdf`.

**Dependencies added for this page:** `jspdf`, `jspdf-autotable`.

### Debts Page (`/dashboard/debts`)
Replicates Kubera's Debts page layout.

**Key files:**
- `src/app/dashboard/debts/page.tsx` — server component, filters assets where `asset_type === 'liability'` or `sheet === 'Debts'`.
- `src/components/dashboard/DebtsContent.tsx` — client component with tabs, table, modal.

**Layout:**
- Large `€XXXX` total + `1 DAY €0` subline. No decorative title when debts exist.
- **Tabs** for each sheet name with subtotal below tab label + `⋮` overflow button.
- **Table** columns: `DEBT | BALANCE`. Rows show `AlignJustify` + `⋮` icons on hover (⋮ opens Delete dropdown). When no debts: 3 gray placeholder rows.
- **`+ ADD DEBT`** dark `#595959` button → opens `AddDebtModal` with action tiles (LOANS & MORTGAGE, CREDIT CARDS, manual entry text link). Tiles are in a modal overlay, NOT on the page body.
- **`+ NEW SECTION`** text link → inline input to name a new section, confirmed with Enter.
