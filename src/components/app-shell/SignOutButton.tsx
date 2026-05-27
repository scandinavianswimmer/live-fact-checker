"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      onClick={() =>
        start(async () => {
          await fetch("/api/auth/sign-out", { method: "POST" });
          router.replace("/");
          router.refresh();
        })
      }
      disabled={pending}
      className="rounded border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-200 hover:bg-white/10 disabled:opacity-50"
    >
      {pending ? "…" : "Sign out"}
    </button>
  );
}
