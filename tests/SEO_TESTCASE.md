# SEO Module Testcase (Module 10)

Domain: https://cookconnectae.com/ — en canonical at `/`, ar at `/ar`. GSC verified via DNS (owner handles DNS, no meta tag).

## T1 — robots.txt
- [ ] GET `/robots.txt` 200, contains `Sitemap: https://cookconnectae.com/sitemap.xml`
- [ ] Disallows `/api/`, `/customer`, `/employee`, `/rider`
- [ ] Allows `/`

## T2 — sitemap.xml
- [ ] GET `/sitemap.xml` 200, valid XML
- [ ] Contains `/`, `/menu`, `/terms`, `/privacy` + `/ar` variants
- [ ] Each url has `hreflang` alternates (en/ar) via `alternates.languages`
- [ ] Excludes `/login`, `/order-tracking`, `/(authenticated)/*`

## T3 — manifest + icons
- [ ] GET `/manifest.webmanifest` 200, name CookConnect, theme `#118B50`
- [ ] favicon `/favicon.svg` + logo `/logo-horizontal.png` exist

## T4 — metadata (view-source `/` and `/ar`)
- [ ] `<link rel="canonical">` = `https://cookconnectae.com/` (en), `.../ar` (ar)
- [ ] `hreflang en/ar/x-default` present
- [ ] OG title/description/image + twitter card present
- [ ] `geo.region=AE-AJ`, `geo.placename=Ajman`, `ICBM` = `25.3969036, 55.5220053`
- [ ] title en ≠ title ar (localized from `messages/*/meta` via `lib/seo.ts`)

## T5 — JSON-LD
- [ ] Landing HTML contains `Restaurant` schema: name `Cook Connect Restaurant LLC`, phone `+971556634050`, address Ajman, geo 25.3969036/55.5220053, hours Sat–Thu 08:00–22:00, sameAs IG/FB/WA
- [ ] Validate at validator.schema.org — 0 errors

## T6 — NAP consistency
- [ ] Footer shows Ajman address (not Dubai), phone, email — matches `Contact.tsx` + `lib/seo.ts`
- [ ] Contact map coords match GEO constants

## T7 — index control
- [ ] `/(authenticated)/*` layouts emit `noindex, nofollow`
- [ ] `/login`, `/order-tracking/*` emit `noindex` (via subtree layouts)
- [ ] `/menu`, `/terms`, `/privacy` indexable with own title/description

## T8 — proxy/matcher
- [ ] `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest` bypass intl middleware (no locale redirect)
- [ ] `npm run build` passes, no metadata warnings
- [ ] `npx tsc --noEmit` + `eslint` clean for touched files
