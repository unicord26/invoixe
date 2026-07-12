import { createClient } from "@supabase/supabase-js";

// Browser Supabase client. Persists the session in localStorage by default.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
