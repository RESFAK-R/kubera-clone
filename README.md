# Kubera Clone

Personal wealth-tracking dashboard inspired by Kubera. The app models assets, debts, net worth, projections and recap views with a modern Next.js interface backed by Supabase.

## What It Does

- Tracks net worth across assets and liabilities
- Manages asset and debt spreadsheets from the dashboard
- Projects wealth scenarios with fast-forward simulations
- Produces recap charts and PDF reports
- Includes beneficiary and document flows
- Provides authenticated login/signup flows with Supabase
- Experiments with an AI assistant surface inside the dashboard

## Stack

- Next.js, React and TypeScript
- Supabase for auth and data access
- Recharts for financial visualizations
- shadcn-style components and Tailwind CSS
- Framer Motion for UI motion
- jsPDF and jsPDF AutoTable for report generation
- Playwright for browser testing/screenshot workflows

## Run Locally

```bash
npm install
cp .env.local.example .env.local # if you add an example file
npm run dev
```

Open `http://localhost:3000`.

## Useful Scripts

```bash
npm run dev      # start the development server
npm run build    # create a production build
npm run start    # run the production build
npm run lint     # run ESLint
```

## Project Layout

```text
src/app/
  dashboard/
    assets/          # asset tracking
    debts/           # liabilities tracking
    fast-forward/    # projections and scenario rules
    networth/        # net worth views
    recap/           # charts and reports
    beneficiary/     # beneficiary/document flows
  login/             # authentication
  signup/            # authentication
src/components/dashboard/
  charts, spreadsheets, navigation and dashboard surfaces
supabase/
  local Supabase configuration
```

## Note

Screenshots are intentionally kept out of the public README until sample data is sanitized. Financial dashboards should not publish real or ambiguous personal data by accident.
