import type { Claim, Session, Source, TranscriptChunk, Verdict } from "@/lib/types";

const VERDICT_EMOJI: Record<Verdict["verdict"], string> = {
  true: "✅",
  false: "❌",
  misleading: "⚠️",
  unverified: "❓",
};

export interface ExportBundle {
  session: Session;
  chunks: TranscriptChunk[];
  claims: Claim[];
  verdictsByClaimId: Record<string, Verdict>;
}

export function renderMarkdown(b: ExportBundle): string {
  const title = b.session.title ?? "Untitled session";
  const startedAt = new Date(b.session.started_at).toLocaleString();
  const endedAt = b.session.ended_at
    ? new Date(b.session.ended_at).toLocaleString()
    : "in progress";
  const durationMin = b.session.duration_ms
    ? Math.round(b.session.duration_ms / 60000)
    : null;

  const lines: string[] = [
    `# ${title}`,
    ``,
    `- Started: ${startedAt}`,
    `- Ended: ${endedAt}`,
    durationMin !== null ? `- Duration: ${durationMin} min` : null,
    `- Speakers: ${b.session.speaker_count}`,
    `- Sensitivity: ${b.session.sensitivity}`,
    ``,
    `## Verifications`,
    ``,
  ].filter((l): l is string => l !== null);

  if (b.claims.length === 0) {
    lines.push(`_No fact-checkable claims surfaced during this session._`, ``);
  } else {
    const sorted = [...b.claims].sort((a, c) => a.start_ms - c.start_ms);
    for (const claim of sorted) {
      const verdict = b.verdictsByClaimId[claim.id];
      const ts = formatTimestamp(claim.start_ms);
      lines.push(`### [${ts}] ${claim.speaker_label ?? "?"} — ${claim.assertion}`);
      if (verdict) {
        lines.push(
          `**${VERDICT_EMOJI[verdict.verdict]} ${verdict.verdict.toUpperCase()}** · ${verdict.confidence}% confidence`,
        );
        lines.push(``);
        lines.push(verdict.summary);
        if (verdict.sources.length) {
          lines.push(``);
          lines.push(`**Sources:**`);
          for (let i = 0; i < verdict.sources.length; i++) {
            lines.push(formatSource(i + 1, verdict.sources[i]));
          }
        }
      } else if (claim.status === "suppressed") {
        lines.push(`_Suppressed — ${claim.suppressed_reason ?? "below confidence threshold"}._`);
      } else {
        lines.push(`_Verification not completed._`);
      }
      lines.push(``);
    }
  }

  lines.push(`## Transcript`, ``);
  const chunks = [...b.chunks].sort((a, c) => a.start_ms - c.start_ms);
  for (const c of chunks) {
    const ts = formatTimestamp(c.start_ms);
    lines.push(`**[${ts}] ${c.speaker_label ?? "?"}**: ${c.text}`);
  }
  lines.push(``);

  return lines.join("\n");
}

function formatTimestamp(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatSource(i: number, s: Source): string {
  const pub = s.publisher ? ` (${s.publisher})` : "";
  return `- [S${i}] [${s.title}](${s.url})${pub}`;
}
