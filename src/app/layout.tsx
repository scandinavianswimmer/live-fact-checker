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

export const metadata: Metadata = {
  title: "Live Fact-Checking Assistant",
  description:
    "Real-time AI co-pilot for podcasters, news anchors, and live hosts. Listens, extracts claims, verifies in under 3 seconds.",
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
