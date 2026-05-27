import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: env.anthropicApiKey() });
  return _client;
}

/**
 * Run Haiku and parse a JSON object out of the response text.
 * Tolerates accidental markdown fences (```json ... ```) just in case.
 */
export async function haikuJSON<T>(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<{ data: T; raw: string; inputTokens: number; outputTokens: number }> {
  const res = await anthropic().messages.create({
    model: env.anthropicHaikuModel(),
    max_tokens: opts.maxTokens ?? 1024,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  const json = extractJSON(text);
  return {
    data: json as T,
    raw: text,
    inputTokens: res.usage.input_tokens,
    outputTokens: res.usage.output_tokens,
  };
}

function extractJSON(text: string): unknown {
  const trimmed = text.trim();
  // Strip ```json ... ``` or ``` ... ``` fences if Haiku ignored the rule.
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch (err) {
    throw new Error(
      `Haiku returned non-JSON output (parse error: ${(err as Error).message}). Raw: ${text.slice(0, 400)}`,
    );
  }
}
