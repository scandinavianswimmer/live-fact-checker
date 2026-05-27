import { createClient as createSbClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Service-role client — bypasses RLS. ONLY use from server routes that have
 * already authorized the caller and validated ownership. Never expose this
 * client to the browser bundle.
 */
export function createServiceClient() {
  return createSbClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
