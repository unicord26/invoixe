-- Leafx Row-Level Security baseline.
-- Enabling RLS with NO policies denies all access to the `anon` and `authenticated`
-- roles (the keys a browser could use). The app connects as the `postgres` superuser
-- via the pooler, which BYPASSES RLS, so Prisma continues to work unchanged.
-- This is defense-in-depth: even if the anon key leaks, the tables are not readable.

ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Business" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Party" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ItemCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."TransactionLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."NumberSeries" ENABLE ROW LEVEL SECURITY;

-- Extra belt-and-braces: revoke direct table privileges from the public API roles.
REVOKE ALL ON ALL TABLES IN SCHEMA "public" FROM anon, authenticated;
