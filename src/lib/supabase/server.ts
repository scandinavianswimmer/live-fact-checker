import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Per-request server client that respects the user's auth cookie.
 * Use this in Route Handlers and Server Components — RLS is enforced.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        for (const { name, value, options } of toSet) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Server Component context — cookies are read-only. Safe to ignore.
          }
        }
      },
    },
  });
}
