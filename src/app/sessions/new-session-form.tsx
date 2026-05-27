"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AudioSource } from "@/lib/types";

export function NewSessionForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [speakerCount, setSpeakerCount] = useState(1);
  const [audioSource, setAudioSource] = useState<AudioSource>("browser_mic");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || undefined,
          audio_source: audioSource,
          speaker_count: speakerCount,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const { session } = (await res.json()) as { session: { id: string } };
      router.push(`/sessions/${session.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-1 min-w-[200px] flex-col gap-1 text-xs text-zinc-400">
        Title (optional)
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ep. 42 — Guest Name"
          className="rounded border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-400/40 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Speakers
        <select
          value={speakerCount}
          onChange={(e) => setSpeakerCount(parseInt(e.target.value, 10))}
          className="rounded border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100"
        >
          <option value={1}>1 (solo)</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        Audio source
        <select
          value={audioSource}
          onChange={(e) => setAudioSource(e.target.value as AudioSource)}
          className="rounded border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100"
        >
          <option value="browser_mic">Browser mic</option>
          <option value="virtual_device">Virtual audio device</option>
          <option value="upload">Upload file</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-emerald-500 px-4 py-1.5 text-sm font-medium text-emerald-950 hover:bg-emerald-400 disabled:opacity-50"
      >
        {submitting ? "Starting…" : "Start session"}
      </button>
      {error && <p className="w-full text-xs text-rose-400">{error}</p>}
    </form>
  );
}
