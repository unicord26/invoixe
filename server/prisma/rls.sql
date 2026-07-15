-- Invoixe Row-Level Security baseline.
--
-- Enabling RLS with NO policies denies all access to the `anon` and `authenticated`
-- roles (the keys a browser could use). The app connects as the `postgres` superuser
-- via the pooler, which BYPASSES RLS, so Prisma continues to work unchanged.
-- This is defense-in-depth: even if the anon key leaks, the tables are not readable.
--
-- The anon key is NOT a secret — it ships inside the browser bundle
-- (NEXT_PUBLIC_SUPABASE_ANON_KEY), so anyone who loads the site holds it. RLS and
-- the REVOKEs below are the only thing between that key and the data.
--
-- Idempotent: re-run after every schema change via `npm run db:rls`.

-- 1) Enable RLS on EVERY table in the public schema.
--
-- Do not hardcode a table list. The previous version named nine tables; the schema
-- grew to twenty-three, and the fourteen newer ones (OtpCode, PaymentCard,
-- BankAccount, Cheque, LoanAccount…) were left readable by the public anon key.
-- Enumerating the catalog means new tables are covered the next time this runs.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '\_prisma%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- 2) Revoke direct table privileges from the public API roles (belt and braces:
--    RLS denies row access, this denies the privilege outright).
REVOKE ALL ON ALL TABLES IN SCHEMA "public" FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "public" FROM anon, authenticated;

-- 3) Make it stick for tables created LATER.
--
-- Supabase's default privileges grant anon/authenticated on newly created tables,
-- which is how `prisma db push` silently re-exposed the schema as it grew. Revoking
-- the default privileges stops that recurring, instead of relying on someone
-- remembering to re-run step 2 after each migration.
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA "public" REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM anon, authenticated;
