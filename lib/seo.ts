export const SITE_URL = "https://cookconnectae.com";

export const SITE_NAME_EN = "CookConnect";
export const SITE_NAME_AR = "كوك كونكت";

export const SITE_META = {
  en: {
    title: "CookConnect Restaurant Ajman | Dine-In, Delivery & Meal Plans",
    description:
      "Cook Connect Restaurant in Al Hamidiya, Ajman — healthy dine-in restaurant, fresh menu, delivery & pickup, plus flexible subscription meal plans. Sat–Thu 8AM–10PM.",
    keywords: [
      "restaurant Ajman",
      "healthy restaurant Ajman",
      "dine-in Ajman",
      "food delivery Ajman",
      "meal plans Ajman",
      "meal subscription UAE",
      "CookConnect",
      "diet meals UAE",
    ],
  },
  ar: {
    title: "مطعم كوك كونكت عجمان | dine-in وتوصيل واشتراكات",
    description:
      "مطعم كوك كونكت في الحميدية، عجمان — مطعم صحي dine-in وقائمة طازجة وتوصيل واستلام، بالإضافة لخطط اشتراك مرنة. السبت–الخميس 8ص–10م.",
    keywords: [
      "مطعم عجمان",
      "مطعم صحي عجمان",
      "dine-in عجمان",
      "توصيل طعام عجمان",
      "خطط وجبات عجمان",
      "اشتراك وجبات الإمارات",
      "كوك كونكت",
    ],
  },
} as const;

export const NAP = {
  name: "Cook Connect Restaurant LLC",
  street: "Sheikh Zayed Street, Al Hamidiya 1",
  city: "Ajman",
  country: "UAE",
  full: "Sheikh Zayed Street, Al Hamidiya 1, Ajman, UAE",
  phone: "+971556634050",
  phoneHref: "tel:+971556634050",
  email: "cookconnectrestaurant@gmail.com",
  hours: "Sat–Thu, 8:00 AM – 10:00 PM",
  license: "77454",
  trn: "100385961600003",
} as const;

export const GEO = {
  lat: 25.3969036,
  lng: 55.5220053,
  region: "AE-AJ",
  placename: "Ajman",
  country: "AE",
} as const;

export const SOCIALS = {
  instagram: "https://www.instagram.com/cookconnectrestaurant",
  facebook: "https://www.facebook.com/cookConnectLLC",
  whatsapp: "https://wa.me/971556634050",
} as const;

export const OG_IMAGE = `${SITE_URL}/ogg-banner_en.png`;
export const LOGO = `${SITE_URL}/favicon.png`;

export function localeUrl(locale: string, path = ""): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === "ar") return `${SITE_URL}/ar${clean === "/" ? "" : clean}`;
  return `${SITE_URL}${clean}`;
}

export function restaurantJsonLd(locale: string) {
  const isAr = locale === "ar";
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${SITE_URL}/#restaurant`,
    name: NAP.name,
    alternateName: isAr ? SITE_NAME_AR : SITE_NAME_EN,
    url: SITE_URL,
    image: [OG_IMAGE, LOGO],
    logo: LOGO,
    description: isAr ? SITE_META.ar.description : SITE_META.en.description,
    servesCuisine: ["Healthy", "Middle Eastern", "Indian", "Italian", "American", "Seafood", "International"],
    priceRange: "AED",
    hasMenu: localeUrl(locale, "/menu"),
    telephone: NAP.phone,
    email: NAP.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: NAP.street,
      addressLocality: NAP.city,
      addressCountry: NAP.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: GEO.lat,
      longitude: GEO.lng,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
        opens: "08:00",
        closes: "22:00",
      },
    ],
    sameAs: [SOCIALS.instagram, SOCIALS.facebook, SOCIALS.whatsapp],
    areaServed: { "@type": "City", name: "Ajman" },
    hasMap: `https://www.google.com/maps?q=${GEO.lat},${GEO.lng}`,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME_EN,
    alternateName: SITE_NAME_AR,
    inLanguage: ["en-AE", "ar-AE"],
  };
}
