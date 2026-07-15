// lib/supabase.ts calls createClient() at import time, which throws if
// SUPABASE_URL is undefined. Any spec that imports a controller reaches it
// transitively, so give the tests inert values. Nothing here connects out;
// specs stub the Supabase and Prisma boundaries.
process.env.SUPABASE_URL ??= "http://localhost:54321";
process.env.SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-key";
process.env.DATABASE_URL ??= "postgresql://user:pass@localhost:5432/test";
process.env.DIRECT_URL ??= process.env.DATABASE_URL;
