"use client";

import { ClaimCard } from "@/components/session/ClaimCard";
import type { Claim, Verdict } from "@/lib/types";

export function ClaimReview({ claim, verdict }: { claim: Claim; verdict: Verdict | undefined }) {
  return <ClaimCard claim={claim} verdict={verdict} />;
}
