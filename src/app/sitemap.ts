import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/docs/audio`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/auth/sign-in`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
  ];
}
