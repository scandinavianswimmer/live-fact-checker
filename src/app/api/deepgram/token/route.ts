import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { grantBrowserToken } from "@/lib/deepgram";

export const runtime = "nodejs";

export async function POST() {
  const { user, response } = await requireUser();
  if (!user) return response;

  try {
    const { token, expires_at } = await grantBrowserToken(60);
    return NextResponse.json({ token, expires_at });
  } catch (err) {
    const detail = (err as Error).message;
    const isForbidden = /403|FORBIDDEN|Insufficient permissions/i.test(detail);
    return NextResponse.json(
      {
        error: "deepgram_token_failed",
        detail,
        hint: isForbidden
          ? "DEEPGRAM_API_KEY needs Member or higher role to mint short-lived tokens. Create a new key in the Deepgram dashboard with the Member role."
          : undefined,
      },
      { status: 502 },
    );
  }
}
