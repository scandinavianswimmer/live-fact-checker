import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { grantBrowserToken } from "@/lib/deepgram";

export const runtime = "nodejs";

/**
 * Returns an auth credential the browser can use to open a WebSocket to
 * Deepgram. Prefers a 60s JWT minted via /v1/auth/grant (requires Member+
 * role on the API key). If that 403s and LFC_DEEPGRAM_ALLOW_RAW_KEY=true is
 * set, we fall back to the master key — which is functionally fine but
 * exposes the key to anyone with browser devtools open. Opt-in only so the
 * downgrade is loud, not silent.
 */
export async function POST() {
  const { user, response } = await requireUser();
  if (!user) return response;

  try {
    const { token, expires_at } = await grantBrowserToken(60);
    return NextResponse.json({ token, expires_at, mode: "jwt" });
  } catch (err) {
    const detail = (err as Error).message;
    const isForbidden = /403|FORBIDDEN|Insufficient permissions/i.test(detail);

    if (isForbidden && process.env.LFC_DEEPGRAM_ALLOW_RAW_KEY === "true") {
      const masterKey = process.env.DEEPGRAM_API_KEY;
      if (masterKey) {
        return NextResponse.json({
          token: masterKey,
          // Long-ish expiry — the key is the key, no real TTL.
          expires_at: Date.now() + 24 * 60 * 60 * 1000,
          mode: "raw",
          warning:
            "Using master DEEPGRAM_API_KEY in browser (LFC_DEEPGRAM_ALLOW_RAW_KEY=true). Upgrade to a Member-scoped key to switch back to short-lived JWTs.",
        });
      }
    }

    return NextResponse.json(
      {
        error: "deepgram_token_failed",
        detail,
        hint: isForbidden
          ? "DEEPGRAM_API_KEY needs Member or higher role to mint short-lived tokens. Either create a Member-scoped key in the Deepgram dashboard, or set LFC_DEEPGRAM_ALLOW_RAW_KEY=true to use the master key directly in the browser (less secure)."
          : undefined,
      },
      { status: 502 },
    );
  }
}
