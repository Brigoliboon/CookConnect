import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const PUBLIC_PATHS = ["/", "/menu", "/terms", "/privacy"];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_PATHS.map((path) => {
    const en = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
    const ar = path === "/" ? `${SITE_URL}/ar` : `${SITE_URL}/ar${path}`;
    return {
      url: en,
      lastModified: now,
      changeFrequency: path === "/" ? "daily" : "weekly",
      priority: path === "/" ? 1 : path === "/menu" ? 0.9 : 0.5,
      alternates: { languages: { en, ar } },
    };
  });
}
