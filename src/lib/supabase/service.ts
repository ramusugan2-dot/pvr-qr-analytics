import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseSecretKey, supabaseUrl } from "@/lib/env";

/**
 * Supabase client with the secret key. It bypasses database security rules,
 * so it is only used by the public scan link, on the server.
 */
export function createServiceClient() {
  return createClient(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
