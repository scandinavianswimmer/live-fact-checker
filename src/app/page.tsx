import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-24">
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-emerald-400">
        Live Fact-Checking Assistant
      </p>
      <h1 className="mb-5 text-5xl font-semibold tracking-tight">
        Verify claims at conversation speed.
      </h1>
      <p className="mb-8 max-w-xl text-lg text-zinc-400">
        A real-time AI co-pilot for podcasters, debate moderators, and live
        hosts. We listen, extract fact-checkable claims, and surface verified
        verdicts with citations in under three seconds.
      </p>
      <div className="flex gap-3">
        <Link
          href="/sessions"
          className="rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-medium text-emerald-950 hover:bg-emerald-400"
        >
          Start a session
        </Link>
        <Link
          href="/sessions"
          className="rounded-md border border-white/15 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/5"
        >
          See past sessions
        </Link>
      </div>
      <div className="mt-16 grid grid-cols-3 gap-6 text-sm text-zinc-400">
        <Tile title="Sub-3s verdicts">
          Deepgram Nova-3 streaming → Claude Haiku claim extraction → Perplexity
          Sonar verification.
        </Tile>
        <Tile title="Silence beats wrong">
          Confidence threshold of 70 by default. Below that, we stay silent.
        </Tile>
        <Tile title="Bring your own audio">
          Browser mic, virtual audio device (Riverside, Zoom, StreamYard), or
          file upload.
        </Tile>
      </div>
    </main>
  );
}

function Tile({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02] p-4">
      <p className="mb-1 text-sm font-medium text-zinc-100">{title}</p>
      <p>{children}</p>
    </div>
  );
}
