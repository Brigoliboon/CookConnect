import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const PUBLIC_PATHS = ["/", "/menu", "/terms", "/privacy"];

const MENU_CATEGORIES = [
  "meals",
  "salad",
  "rice-sides",
  "platters",
  "pasta",
  "wraps",
  "pizza",
  "burgers",
  "desserts",
  "drinks",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entry = (path: string, priority: number) => {
    const en = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
    const ar = path === "/" ? `${SITE_URL}/ar` : `${SITE_URL}/ar${path}`;
    return {
      url: en,
      lastModified: now,
      changeFrequency: path === "/" ? ("daily" as const) : ("weekly" as const),
      priority,
      alternates: { languages: { en, ar } },
    };
  };
  return [
    ...PUBLIC_PATHS.map((path) =>
      entry(path, path === "/" ? 1 : path === "/menu" ? 0.9 : 0.5),
    ),
    ...MENU_CATEGORIES.map((cat) => entry(`/menu/${cat}`, 0.7)),
  ];
}
