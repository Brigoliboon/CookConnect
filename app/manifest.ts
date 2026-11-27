import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CookConnect Restaurant Ajman",
    short_name: "CookConnect",
    description:
      "Healthy dine-in restaurant in Ajman with fresh menu, delivery & pickup, plus subscription meal plans.",
    start_url: "/employee",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#118B50",
    lang: "en",
    dir: "auto",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
