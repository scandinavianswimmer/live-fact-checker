import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";
import { PLAN_LABEL, type Plan } from "@/lib/plans";

export async function NavBar() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  let plan: Plan = "free";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();
    plan = ((profile?.plan as Plan) ?? "free") as Plan;
  }

  return (
    <header className="border-b border-white/10 bg-zinc-950/60 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3">
        <Link href={user ? "/sessions" : "/"} className="flex items-center gap-2 text-sm">
          <span className="inline-block size-2 rounded-full bg-emerald-400" />
          <span className="font-semibold tracking-tight text-zinc-100">Live Fact-Check</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/sessions" className="text-zinc-300 hover:text-zinc-100">
                Sessions
              </Link>
              <Link href="/docs/audio" className="text-zinc-300 hover:text-zinc-100">
                Audio setup
              </Link>
              <span className="hidden text-zinc-500 md:inline">
                {user.email}
              </span>
              <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs uppercase tracking-wider text-zinc-300">
                {PLAN_LABEL[plan]}
              </span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/docs/audio" className="text-zinc-300 hover:text-zinc-100">
                Audio setup
              </Link>
              <Link
                href="/auth/sign-in"
                className="rounded bg-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-950 hover:bg-emerald-400"
              >
                Sign in
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
