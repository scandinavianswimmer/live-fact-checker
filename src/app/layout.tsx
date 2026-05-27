import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/app-shell/NavBar";
import { MissingKeysBanner } from "@/components/app-shell/MissingKeysBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Live Fact-Check — Verify claims at conversation speed",
    template: "%s · Live Fact-Check",
  },
  description:
    "Real-time AI co-pilot for podcasters, news hosts, and live broadcasters. Listens to your conversation, extracts fact-checkable claims, and surfaces verified verdicts with citations in under three seconds.",
  applicationName: "Live Fact-Check",
  keywords: [
    "podcast fact-check",
    "live fact-check",
    "real-time transcription",
    "podcast research",
    "Deepgram",
    "Perplexity Sonar",
    "Claude Haiku",
  ],
  openGraph: {
    title: "Live Fact-Check — Verify claims at conversation speed",
    description:
      "Real-time AI co-pilot for podcasters, news hosts, and live broadcasters. Sub-3-second claim → verdict latency, with source citations.",
    url: SITE_URL,
    siteName: "Live Fact-Check",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Live Fact-Check — Verify claims at conversation speed",
    description:
      "Real-time AI co-pilot for podcasters and live broadcasters. Sub-3-second claim → verdict.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-950 text-zinc-100 flex flex-col">
        <NavBar />
        <MissingKeysBanner />
        {children}
      </body>
    </html>
  );
}
