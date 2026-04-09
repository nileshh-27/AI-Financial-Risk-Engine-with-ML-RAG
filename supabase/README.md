# Supabase setup for Risk-Dashboard-UI

## 1) Create a Supabase project
- Create a project in Supabase.
- In **Project Settings → API**, copy:
  - Project URL → set as `VITE_SUPABASE_URL`
  - `anon public` key → set as `VITE_SUPABASE_ANON_KEY`

Create a `.env` (or `.env.local`) for the Vite client with:

- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`

## 2) Run the SQL migration
Open **SQL Editor** in Supabase and run:

- [supabase/migrations/001_init.sql](supabase/migrations/001_init.sql)

This creates:
- `profiles`
- `risk_assessments`
- `portfolio_allocations`
- `portfolio_accounts`
- `transactions`

…with Row Level Security (RLS) policies so each signed-in user only sees their own rows.

## 3) Add some data
- Sign up / sign in in the app.
- Optional: seed rows using the commented `insert` statements at the bottom of the SQL file.
  - Replace `<YOUR_USER_UUID>` with your Supabase Auth user id.

Column naming: the database uses `snake_case` (e.g., `risk_assessments.risk_score`).
The UI maps these into camelCase fields internally.

## 4) What changed in the app
- Risk computation still calls the server endpoint `/api/risk/assess`.
- Risk history is now read from Supabase table `risk_assessments`.
- Portfolio and Transactions pages now read from Supabase tables with demo fallbacks when empty.

