import Link from "next/link";
import {
  Mic,
  Sparkles,
  ShieldCheck,
  Zap,
  Headphones,
  Radio,
  Gavel,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export default function Landing() {
  return (
    <main className="flex-1">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_50%)]" />
        <div className="mx-auto w-full max-w-5xl px-6 pt-20 pb-24 md:pt-28">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
            <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-400" />
            Real-time fact-checking
          </p>
          <h1 className="mb-6 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Verify claims at conversation speed.
          </h1>
          <p className="mb-8 max-w-2xl text-lg text-zinc-400 md:text-xl">
            A real-time co-pilot that listens to your podcast, interview, or live
            broadcast — extracts every fact-checkable claim and surfaces a
            verified verdict with citations in under three seconds.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/auth/sign-in"
              className="rounded-md bg-emerald-500 px-5 py-3 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400"
            >
              Start a session — free
            </Link>
            <Link
              href="/docs/audio"
              className="rounded-md border border-white/15 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
            >
              How to capture audio
            </Link>
          </div>
          <p className="mt-6 text-xs text-zinc-500">
            No bot in your call. No cloud transcription cost to you. 3 free sessions to try.
          </p>
        </div>
      </section>

      {/* DEMO CARD */}
      <section className="border-b border-white/10 bg-zinc-950">
        <div className="mx-auto w-full max-w-5xl px-6 py-16">
          <div className="grid items-start gap-10 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-emerald-400">
                Live demo
              </p>
              <h2 className="mb-4 text-3xl font-semibold tracking-tight">
                What you see during a recording.
              </h2>
              <p className="mb-4 text-zinc-400">
                The host&apos;s screen on the right shows verified verdicts as
                each claim is made. Color-coded, citation-linked, dismissable.
                You glance — you decide what to reference on air.
              </p>
              <ul className="space-y-2 text-sm text-zinc-300">
                <Feature icon={Clock}>Sub-3-second claim → verdict latency.</Feature>
                <Feature icon={ShieldCheck}>
                  Confidence threshold of 70 by default. Below that, we stay silent.
                </Feature>
                <Feature icon={Sparkles}>
                  Per-claim source citations from Perplexity Sonar.
                </Feature>
              </ul>
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-5 shadow-2xl shadow-emerald-500/5">
              <DemoCard
                verdict="false"
                speaker="Guest"
                claim="The Great Wall of China is visible from space with the naked eye."
                summary="NASA and multiple astronaut accounts confirm the wall is not visible from low Earth orbit without aids. The myth has been repeatedly debunked."
                confidence={94}
                sources={[
                  { title: "NASA — Great Wall myth", publisher: "nasa.gov" },
                  { title: "Scientific American", publisher: "scientificamerican.com" },
                ]}
              />
              <div className="mt-3" />
              <DemoCard
                verdict="true"
                speaker="Host"
                claim="The first human heart transplant was performed in 1967 in Cape Town."
                summary="Dr. Christiaan Barnard performed the first successful human-to-human heart transplant on December 3, 1967 at Groote Schuur Hospital."
                confidence={97}
                sources={[
                  { title: "Encyclopaedia Britannica", publisher: "britannica.com" },
                  { title: "Groote Schuur archive", publisher: "westerncape.gov.za" },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b border-white/10">
        <div className="mx-auto w-full max-w-5xl px-6 py-20">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-emerald-400">
            How it works
          </p>
          <h2 className="mb-12 text-3xl font-semibold tracking-tight">
            Three agents, working in parallel.
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Step
              n="1"
              icon={Mic}
              title="Capture"
              body="Browser mic, or a virtual audio device (BlackHole / VB-Cable) for Riverside, Zoom, and StreamYard. No bot joins your call."
            />
            <Step
              n="2"
              icon={Zap}
              title="Detect"
              body="Deepgram Nova-3 transcribes with diarization. Claude Haiku scans a rolling 30s window for falsifiable claims — filtering out opinion, hedging, and jokes."
            />
            <Step
              n="3"
              icon={ShieldCheck}
              title="Verify"
              body="Perplexity Sonar pulls fresh sources. Haiku scores the verdict and confidence. Below 70%, we stay silent — silence beats wrong."
            />
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="border-b border-white/10 bg-zinc-950">
        <div className="mx-auto w-full max-w-5xl px-6 py-20">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-emerald-400">
            Built for
          </p>
          <h2 className="mb-12 text-3xl font-semibold tracking-tight">
            Anyone whose mouth is the product.
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            <UseCase
              icon={Headphones}
              title="Podcasters"
              body="Solo shows can't afford a $200k research producer. Two-person interviews need both speakers covered. We do both."
            />
            <UseCase
              icon={Radio}
              title="News hosts"
              body="Live broadcast verification during interviews and panels — without the visible bot that Otter, Fathom, or Fireflies put in your meeting."
            />
            <UseCase
              icon={Gavel}
              title="Debate moderators"
              body="Political and academic debate. Verified claim history piped to your control room or earpiece."
            />
            <UseCase
              icon={Sparkles}
              title="Streamers"
              body="Sports, finance, news commentary. Catch the live claim, get a verdict in the next breath."
            />
          </div>
        </div>
      </section>

      {/* STACK */}
      <section className="border-b border-white/10">
        <div className="mx-auto w-full max-w-5xl px-6 py-20">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-emerald-400">
            Stack
          </p>
          <h2 className="mb-8 text-3xl font-semibold tracking-tight">
            The fast path, end to end.
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <StackTile name="Deepgram Nova-3" role="Streaming transcription + diarization" />
            <StackTile name="Claude Haiku" role="Claim extraction + verdict scoring" />
            <StackTile name="Perplexity Sonar" role="Live source verification" />
            <StackTile name="Supabase" role="Postgres + Auth + Realtime" />
            <StackTile name="Next.js 16" role="Frontend + serverless API" />
            <StackTile name="Vercel" role="Edge deploy" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-white/10 bg-zinc-950">
        <div className="mx-auto w-full max-w-3xl px-6 py-20">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-emerald-400">FAQ</p>
          <h2 className="mb-10 text-3xl font-semibold tracking-tight">Common questions.</h2>
          <div className="space-y-6">
            <Faq q="Does it record my call?">
              We process audio in real time. Transcript and verdicts are stored in
              your account so you can review and export. We don&apos;t retain raw
              audio.
            </Faq>
            <Faq q="What if the verdict is wrong?">
              We require 70% confidence by default before showing a verdict.
              Below that, we stay silent. Every verdict ships with source links
              so you can sanity-check in one click.
            </Faq>
            <Faq q="Can I use it on Zoom / Riverside / StreamYard?">
              Yes — route your call audio through BlackHole (Mac) or VB-Cable
              (Windows), then pick that device in the browser. See the audio
              setup guide.
            </Faq>
            <Faq q="Is there a bot in my call?">
              No. We capture from your local audio — there&apos;s nothing for
              participants to see. Unlike Otter, Fathom, and Fireflies.
            </Faq>
            <Faq q="Does it support multiple speakers?">
              Yes. Deepgram diarization separates host from guests. Two-speaker
              support is in the Pro tier.
            </Faq>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto w-full max-w-3xl px-6 py-24 text-center">
          <h2 className="mb-4 text-4xl font-semibold tracking-tight">
            Demo it on your next conversation.
          </h2>
          <p className="mb-8 text-zinc-400">
            Three free sessions. No credit card. 30 seconds to setup.
          </p>
          <Link
            href="/auth/sign-in"
            className="inline-flex rounded-md bg-emerald-500 px-6 py-3 text-sm font-medium text-emerald-950 transition hover:bg-emerald-400"
          >
            Start a session
          </Link>
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-emerald-400" />
      <span>{children}</span>
    </li>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  body,
}: {
  n: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-semibold text-emerald-300">
          {n}
        </span>
        <Icon className="size-4 text-zinc-400" />
      </div>
      <p className="mb-2 text-base font-medium text-zinc-100">{title}</p>
      <p className="text-sm leading-relaxed text-zinc-400">{body}</p>
    </div>
  );
}

function UseCase({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-3 flex items-center gap-3">
        <Icon className="size-5 text-emerald-400" />
        <p className="text-base font-medium text-zinc-100">{title}</p>
      </div>
      <p className="text-sm leading-relaxed text-zinc-400">{body}</p>
    </div>
  );
}

function StackTile({ name, role }: { name: string; role: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02] p-4">
      <p className="text-sm font-medium text-zinc-100">{name}</p>
      <p className="text-xs text-zinc-500">{role}</p>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-base font-medium text-zinc-100">{q}</p>
      <p className="text-sm leading-relaxed text-zinc-400">{children}</p>
    </div>
  );
}

function DemoCard({
  verdict,
  speaker,
  claim,
  summary,
  confidence,
  sources,
}: {
  verdict: "true" | "false" | "misleading" | "unverified";
  speaker: string;
  claim: string;
  summary: string;
  confidence: number;
  sources: Array<{ title: string; publisher: string }>;
}) {
  const palette = {
    true: { border: "border-emerald-500/40", bg: "bg-emerald-500/5", dot: "bg-emerald-400", label: "True", icon: CheckCircle2 },
    false: { border: "border-rose-500/40", bg: "bg-rose-500/5", dot: "bg-rose-400", label: "False", icon: AlertTriangle },
    misleading: { border: "border-amber-500/40", bg: "bg-amber-500/5", dot: "bg-amber-400", label: "Misleading", icon: AlertTriangle },
    unverified: { border: "border-zinc-500/40", bg: "bg-zinc-500/5", dot: "bg-zinc-400", label: "Unverified", icon: AlertTriangle },
  }[verdict];
  const Icon = palette.icon;
  return (
    <div className={`rounded-lg border ${palette.border} ${palette.bg} p-4`}>
      <div className="mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={`inline-block size-2 rounded-full ${palette.dot}`} />
          <Icon className="size-3.5 text-zinc-300" />
          <span className="font-semibold uppercase tracking-wider text-zinc-100">
            {palette.label}
          </span>
          <span className="text-zinc-400">· {confidence}% confidence</span>
        </div>
        <span className="text-zinc-500">{speaker}</span>
      </div>
      <p className="mb-2 text-sm font-medium text-zinc-100">{claim}</p>
      <p className="mb-3 text-sm text-zinc-400">{summary}</p>
      <ul className="space-y-1 border-t border-white/10 pt-2 text-xs">
        {sources.map((s, i) => (
          <li key={s.title} className="flex items-center gap-2">
            <span className="text-zinc-500">[S{i + 1}]</span>
            <span className="flex-1 truncate text-zinc-300">{s.title}</span>
            <span className="text-zinc-500">{s.publisher}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
