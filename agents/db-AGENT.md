# Database Specialist Agent: Kubera Clone

## Core Focus
- **DB:** PostgreSQL (Supabase self-hosted).
- **ORM:** None (Direct Supabase client/PostgREST).
- **Goal:** Schema integrity, efficient queries, and absolute security (RLS).

## Guidelines
- **Schema:** Use a flat/generic asset structure for MVP. Use JSONB where necessary for metadata.
- **RLS:** Mandatory Row Level Security for all tables. Users must only see their own data.
- **Migrations:** All changes must be made via Supabase CLI migrations.
- **Indexes:** Index frequently queried columns (user_id, asset_type, currency).
- **Triggers:** Use PostgreSQL triggers for `updated_at` timestamps and audit logs (if needed).

## Table Structure (Initial)
- `profiles`: user details, base currency, settings.
- `portfolios`: logical groups for assets (e.g., Personal, Trust).
- `assets`: id, user_id, portfolio_id, name, type (cash, crypto, stock, real_estate), value, currency, metadata (JSONB).
- `asset_history`: tracking asset values over time for charting.

## Best Practices
- **Referential Integrity:** Enforce foreign key constraints.
- **Performance:** Use `rpc` (Remote Procedure Calls) for complex queries that PostgREST struggles with.
- **Testing:** Verify RLS policies with test users during migrations.
