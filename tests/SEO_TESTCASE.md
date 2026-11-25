# SEO Module Testcase (Module 10)

Domain: https://www.cookconnectae.com/ — en canonical at `/`, ar at `/ar`. The bare domain redirects to `www` with a 308. GSC verified via DNS (owner handles DNS, no meta tag).

## T1 — robots.txt
- [ ] GET `/robots.txt` 200, contains `Sitemap: https://www.cookconnectae.com/sitemap.xml`
- [ ] Disallows `/api/`, `/customer`, `/employee`, `/rider`
- [ ] Allows `/`

## T2 — sitemap.xml
- [ ] GET `/sitemap.xml` 200, valid XML
- [ ] Contains 28 URLs: `/`, `/menu`, 10 category pages, `/terms`, `/privacy`, each with an `/ar` variant
- [ ] Each URL has `hreflang` alternates (en/ar/x-default) via `alternates.languages`
- [ ] Each URL has a fixed `lastmod` date, not the build time
- [ ] Excludes `/login`, `/order-tracking`, `/subscription-onboarding`, `/(authenticated)/*`

## T3 — manifest + icons
- [ ] GET `/manifest.webmanifest` 200, name `CookConnect Restaurant Ajman`, theme `#118B50`
- [ ] Icons `/icon-192.png` (192×192), `/icon-512.png` (512×512), and `/apple-touch-icon.png` (180×180) exist and are square
- [ ] `/favicon.svg` exists and is under 10 KB
- [ ] Both share images `/ogg-banner_en.jpg` and `/ogg-banner_ar.jpg` are 1200×630 and under 300 KB

## T4 — metadata (view-source `/` and `/ar`)
- [ ] `<link rel="canonical">` = `https://www.cookconnectae.com/` (en), `.../ar` (ar)
- [ ] `hreflang en/ar/x-default` present
- [ ] OG title/description/image + twitter card present
- [ ] OG/twitter image is locale-specific: `/ogg-banner_en.jpg` (en), `/ogg-banner_ar.jpg` (ar)
- [ ] `geo.region=AE-AJ`, `geo.placename=Ajman`, `ICBM` = `25.3969036, 55.5220053`
- [ ] title en ≠ title ar (localized from `SITE_META` in `lib/seo.ts`; `messages/*/meta` is unused)
- [ ] No `keywords` meta tag
- [ ] The brand appears once in page titles (`/menu`, `/terms`, `/privacy`, `/login`, `/order-tracking/[code]`)
- [ ] `/menu`, `/terms`, `/privacy`, and `/menu/[category]` set their own description, not the homepage copy
- [ ] `/subscription-onboarding` has its own title and `noindex`
- [ ] `/login` and `/order-tracking/*` are localized and `noindex`

## T5 — JSON-LD
- [ ] Landing HTML contains `Restaurant` schema: name `Cook Connect Restaurant LLC`, phone `+971 56 335 6051`, address Ajman, `addressCountry` `AE`, geo 25.3969036/55.5220053, hours Sat–Thu 08:00–22:00, sameAs IG/FB/WA
- [ ] Menu and category `ItemList` schema omit unknown/zero nutrition values instead of publishing `0`
- [ ] Validate at validator.schema.org — 0 errors

## T6 — NAP consistency
- [ ] Footer shows Ajman address (not Dubai), phone, email — matches `Contact.tsx` + `lib/seo.ts`
- [ ] Contact map coords match GEO constants

## T7 — index control
- [ ] `/(authenticated)/*` layouts emit `noindex, nofollow`
- [ ] `/login`, `/order-tracking/*` emit `noindex` (via subtree layouts)
- [ ] `/menu`, `/terms`, `/privacy`, and category pages are indexable with their own title/description
- [ ] A category page is `noindex` only when the database query succeeds and returns no items; a failed query stays indexable
- [ ] Unknown public paths show the branded 404 with localized title and exactly one `noindex` tag

## T8 — navigation and headings
- [ ] `/menu` has an H1 and 10 crawlable category links
- [ ] Every `/menu/[category]` page has an H1 without the brand
- [ ] Homepage and footer link to all 10 category pages, terms, and privacy
- [ ] The language switch exposes a crawlable link to the other locale
- [ ] "View Full Menu" on the homepage points to `/menu`, not the staff area
- [ ] `#meals`-style links have matching targets, and non-home pages point to `/#…`

## T9 — proxy/matcher
- [ ] `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest` bypass intl middleware (no locale redirect)
- [ ] `https://cookconnectae.com` returns 308 to `https://www.cookconnectae.com/`
- [ ] `npm run build` passes, no metadata warnings
- [ ] `npx tsc --noEmit` + `eslint` clean for touched files
