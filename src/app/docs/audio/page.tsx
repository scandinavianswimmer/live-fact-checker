import Link from "next/link";

export default function AudioSetupPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-emerald-400">
        Audio setup
      </p>
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">
        Capture audio from anywhere
      </h1>
      <p className="mb-10 max-w-2xl text-zinc-400">
        The simplest case is a solo recording on your laptop mic — just pick{" "}
        <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">Browser mic</code>{" "}
        when you start a session. For Riverside / Zoom / StreamYard interviews and
        any case where guest audio is on a remote machine, route everything
        through a virtual audio device so both speakers stream into one session.
      </p>

      <Section title="Solo (host only)" subtitle="Browser mic — 30 seconds">
        <ol className="list-decimal space-y-2 pl-5 text-zinc-300">
          <li>
            <Link href="/sessions" className="text-emerald-400 hover:underline">Start a session</Link>{" "}
            with audio source <em>Browser mic</em>.
          </li>
          <li>Grant microphone permission when prompted.</li>
          <li>Done. Transcripts start within a second of speaking.</li>
        </ol>
      </Section>

      <Section title="macOS — BlackHole" subtitle="Free, open source, the standard">
        <ol className="list-decimal space-y-3 pl-5 text-zinc-300">
          <li>
            Install BlackHole 2ch:{" "}
            <a
              href="https://existential.audio/blackhole/"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:underline"
            >
              existential.audio/blackhole
            </a>
            . The 2-channel build is enough for stereo capture.
          </li>
          <li>
            Open <em>Audio MIDI Setup</em> (Spotlight) → create a{" "}
            <em>Multi-Output Device</em> that includes your speakers/headphones
            and BlackHole 2ch. Tick &ldquo;Drift Correction&rdquo; on BlackHole.
            Set this as your Mac system output so you can still hear the call.
          </li>
          <li>
            Optional: create an <em>Aggregate Device</em> if you want to mix mic +
            BlackHole into one stream. Otherwise route your mic separately.
          </li>
          <li>
            In Riverside / Zoom / Meet, set the output device to BlackHole 2ch.
          </li>
          <li>
            In Chrome or Edge, the browser will list BlackHole as an input. The
            session picker uses{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
              getUserMedia
            </code>{" "}
            so pick BlackHole when prompted.
          </li>
        </ol>
      </Section>

      <Section title="Windows — VB-Cable" subtitle="Donationware, equivalent setup">
        <ol className="list-decimal space-y-3 pl-5 text-zinc-300">
          <li>
            Install VB-Cable:{" "}
            <a
              href="https://vb-audio.com/Cable/"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:underline"
            >
              vb-audio.com/Cable
            </a>
            . Reboot after install.
          </li>
          <li>
            <em>Sound Settings</em> → make <em>CABLE Input</em> the default
            playback device. Open the listening loopback so you still hear audio
            in your headphones (Sound Control Panel → Recording → CABLE Output
            → Properties → Listen → &ldquo;Listen to this device&rdquo;).
          </li>
          <li>In your call tool, route output to <em>CABLE Input</em>.</li>
          <li>
            In the browser, pick <em>CABLE Output</em> as the mic source when
            starting a session.
          </li>
        </ol>
      </Section>

      <Section title="Two-speaker (host + guest, both audible)" subtitle="Recommended for interviews">
        <p className="text-zinc-300">
          Run a 2-speaker session. Deepgram diarization assigns each utterance to
          speaker 0 / 1 / 2&hellip;. The app labels speaker 0 as <em>Host</em> and
          the rest as <em>Guest 1</em>, <em>Guest 2</em>, etc. For best results:
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-zinc-300">
          <li>Keep mic gain consistent across speakers.</li>
          <li>
            Distinctly different voices diarize cleanly. Similar voices drift —
            check the verdict cards&apos; speaker labels mid-session.
          </li>
          <li>
            If you can record a separate guest stream (Riverside &ldquo;Local
            Recording&rdquo; mode does this), upload that for post-session
            review in a later sprint.
          </li>
        </ul>
      </Section>

      <Section title="Troubleshooting" subtitle="Common issues">
        <ul className="list-disc space-y-2 pl-5 text-zinc-300">
          <li>
            <strong>Browser shows no mic option.</strong> macOS: System Settings
            → Privacy &amp; Security → Microphone → enable for your browser.
            Reload the tab after granting.
          </li>
          <li>
            <strong>Transcript shows nothing.</strong> Confirm the level meter
            on your call tool moves. If yes but no transcript, your browser
            isn&apos;t receiving the routed stream — pick the BlackHole / CABLE
            Output input explicitly.
          </li>
          <li>
            <strong>Echo on the call.</strong> Disable Listen-to-this-device on
            the loopback once you confirm routing — or use a Multi-Output Device
            that includes your physical speakers/headphones so you hear the call
            directly, not through monitoring.
          </li>
          <li>
            <strong>Cards stop appearing mid-session.</strong> Open the browser
            console — Deepgram WebSocket may have dropped. The session controls
            offer Pause / Resume which mints a fresh Deepgram JWT.
          </li>
        </ul>
      </Section>
    </main>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10 rounded-md border border-white/10 bg-white/[0.02] p-5">
      <h2 className="text-lg font-medium text-zinc-100">{title}</h2>
      {subtitle && <p className="mb-4 text-xs uppercase tracking-wider text-zinc-500">{subtitle}</p>}
      {children}
    </section>
  );
}
