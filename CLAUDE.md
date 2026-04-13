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
