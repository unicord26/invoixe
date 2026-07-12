import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;

// Anon client — used only to validate a caller's access token via auth.getUser().
export const supabaseAnon = createClient(url, process.env.SUPABASE_ANON_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Service-role client — full admin (used for server-side user provisioning if needed).
export const supabaseAdmin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});
