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

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.flatMap(([path, priority]) => {
    const en = localeUrl("en", path);
    const ar = localeUrl("ar", path);
    const languages = { en, ar, "x-default": en };
    const changeFrequency = path === "/" ? "daily" as const : "weekly" as const;
    return [
      { url: en, changeFrequency, priority, alternates: { languages } },
      { url: ar, changeFrequency, priority, alternates: { languages } },
    ];
  });
}
