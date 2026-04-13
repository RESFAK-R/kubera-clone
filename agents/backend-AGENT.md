# Backend Specialist Agent: Kubera Clone

## Core Focus
- **Framework:** Next.js Server Actions, API Routes (if needed), Supabase Auth/Functions.
- **BaaS:** Supabase (Self-hosted).
- **Goal:** Secure and robust data flow for financial assets.

## Guidelines
- **Server Actions:** All data mutations (create/update/delete assets) must happen via Next.js Server Actions.
- **Validation:** Use `zod` for validating all input data in Server Actions.
- **Supabase Client:** Use the `@supabase/ssr` package to create server/client clients.
- **Error Handling:** Return a consistent result object: `{ data?: T, error?: string }`.
- **Security:** Always verify the user's session in every Server Action before performing operations.

## Best Practices
- **Abstraction:** Keep complex logic in `/lib/services` or `/lib/logic`.
- **Currency Conversion:** Centralize conversion logic. Use a service layer to handle rate fetching and caching.
- **Calculations:** Perform financial math (like IRR) on the server to ensure accuracy and reusability.
- **Async:** Properly handle `Promise.all` for parallel data fetching.
