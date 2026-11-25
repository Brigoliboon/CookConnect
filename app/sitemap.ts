import type { MetadataRoute } from "next";
import { localeUrl } from "@/lib/seo";

const PUBLIC_PATHS = [
  ["/", 1],
  ["/menu", 0.9],
  ["/menu/meals", 0.7],
  ["/menu/salad", 0.7],
  ["/menu/rice-sides", 0.7],
  ["/menu/platters", 0.7],
  ["/menu/pasta", 0.7],
  ["/menu/wraps", 0.7],
  ["/menu/pizza", 0.7],
  ["/menu/burgers", 0.7],
  ["/menu/desserts", 0.7],
  ["/menu/drinks", 0.7],
  ["/terms", 0.5],
  ["/privacy", 0.5],
] as const;

const LAST_MODIFIED: Record<string, string> = {
  "/": "2026-11-25",
  "/menu": "2026-11-25",
  "/terms": "2026-08-20",
  "/privacy": "2026-08-20",
};

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.flatMap(([path, priority]) => {
    const en = localeUrl("en", path);
    const ar = localeUrl("ar", path);
    const languages = { en, ar, "x-default": en };
    const changeFrequency = path === "/" ? "daily" as const : "weekly" as const;
    const lastModified = new Date(LAST_MODIFIED[path] ?? LAST_MODIFIED["/menu"]);
    return [
      { url: en, lastModified, changeFrequency, priority, alternates: { languages } },
      { url: ar, lastModified, changeFrequency, priority, alternates: { languages } },
    ];
  });
}
