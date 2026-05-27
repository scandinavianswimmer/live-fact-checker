"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInShell />}>
      <SignInForm />
    </Suspense>
  );
}

function SignInShell({ children }: { children?: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6">
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-emerald-400">
        Sign in
      </p>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">
        Get a magic link
      </h1>
      {children}
    </main>
  );
}

/**
 * Magic-link sign-in. Supabase emails a one-tap link; on click the user lands
 * back here with the auth cookie set, and we redirect to /sessions.
 */
function SignInForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/sessions";
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If we already have a session (e.g. user clicked the magic-link), bounce.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(next);
    });
  }, [next, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${next}`,
      },
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <SignInShell>
      {sent ? (
        <p className="text-sm text-zinc-300">
          Check <span className="text-zinc-100">{email}</span> for a sign-in link.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@studio.com"
            className="rounded border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-400/40 focus:outline-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-emerald-500 px-4 py-2.5 text-sm font-medium text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send link"}
          </button>
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </form>
      )}
    </SignInShell>
  );
}
