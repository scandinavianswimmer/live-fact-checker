import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewSessionForm } from "./new-session-form";

export default async function SessionsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    redirect("/auth/sign-in");
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title, status, started_at, ended_at, duration_ms")
    .order("started_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="mb-1 text-xs uppercase tracking-[0.2em] text-emerald-400">
            Sessions
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Your recordings</h1>
        </div>
      </header>

      <section className="mb-10 rounded-md border border-white/10 bg-white/[0.02] p-5">
        <h2 className="mb-3 text-sm font-medium text-zinc-200">Start a new session</h2>
        <NewSessionForm />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-zinc-200">History</h2>
        {!sessions || sessions.length === 0 ? (
          <p className="text-sm text-zinc-500">No sessions yet.</p>
        ) : (
          <ul className="divide-y divide-white/5 rounded-md border border-white/10">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/sessions/${s.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-white/[0.03]"
                >
                  <div>
                    <p className="text-zinc-100">{s.title ?? "Untitled session"}</p>
                    <p className="text-xs text-zinc-500">
                      {new Date(s.started_at).toLocaleString()} · {s.status}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {s.duration_ms ? `${Math.round(s.duration_ms / 60000)} min` : "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
