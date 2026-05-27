import { DeepgramClient } from "@deepgram/sdk";
import { env } from "@/lib/env";

let _client: DeepgramClient | null = null;

function dg(): DeepgramClient {
  if (!_client) _client = new DeepgramClient({ apiKey: env.deepgramApiKey() });
  return _client;
}

/**
 * Mint a short-lived JWT the browser can use to open a WebSocket directly
 * to Deepgram. TTL stays short (60s) — the browser reconnects with a fresh
 * token if the user pauses/resumes.
 */
export async function grantBrowserToken(ttlSeconds = 60): Promise<{
  token: string;
  expires_at: number;
}> {
  // HttpResponsePromise<T> extends Promise<T> — awaiting yields the body.
  const body = await dg().auth.v1.tokens.grant({ ttl_seconds: ttlSeconds });
  if (!body.access_token) {
    throw new Error("Deepgram tokens.grant returned no access_token");
  }
  return { token: body.access_token, expires_at: Date.now() + ttlSeconds * 1000 };
}
