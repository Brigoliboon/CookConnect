import { restaurantJsonLd, websiteJsonLd } from "@/lib/seo";

export function RestaurantJsonLd({ locale }: { locale: string }) {
  const payload = [restaurantJsonLd(locale), websiteJsonLd()];
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(payload).replace(/</g, "\\u003c"),
      }}
    />
  );
}
