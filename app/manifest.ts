import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CookConnect Restaurant Ajman - Dine-In, Delivery & Meal Plans",
    short_name: "CookConnect",
    description:
      "Healthy dine-in restaurant in Ajman with fresh menu, delivery & pickup, plus subscription meal plans.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#118B50",
    lang: "en",
    dir: "auto",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/logo-horizontal.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
