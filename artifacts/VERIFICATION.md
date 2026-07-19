# Website V3 Verification

## Scope

Website V3 replaces the client-rendered V2 prototype with a generated static multipage site for Cloudflare Pages. The separate public Marble Quote Portal remains the only quote-data collection surface.

## Safety decisions

- Phone links are omitted until a verified number is supplied.
- Insurance, background-check, supplies, review, rating, staff, vehicle, and completed-job claims remain disabled.
- No analytics or third-party trackers are enabled.
- Policy pages are visibly described as drafts pending professional review.
- Synthetic concept imagery is permanently disclosed as brand imagery and is never represented as customer work.

## Automated evidence

Executed with bundled Node on 2026-07-19:

- Contracted route test: passed.
- Unique title, description, canonical URL, and H1 test: passed.
- Internal route-link test: passed with zero broken route links.
- Separate public portal CTA test: passed across all routes.
- Unverified-claim and telephone-schema guard: passed.
- Core HTML accessibility/security affordance test: passed.
- Encoding-safe UI-symbol test: passed; generated HTML contains no mojibake arrow or copyright sequences.
- Automated total: **9 passed, 0 failed**.
- Production build: passed; **22 static routes** generated in `dist/`.
- Browser rendering: passed for the homepage, detail-cleaning service page, Bowie service-area page, privacy-policy draft, and custom 404.
- Representative pages exposed one H1, unique document titles, primary navigation, and the public portal CTA.
- Permanent brand imagery: two optimized synthetic WebP concepts render with visible AI-generated captions, `MM` brand marks, descriptive alternative text, and a footer disclosure.
- Approved synthetic company seal: optimized to WebP and rendered in the homepage hero, footer, and Open Graph/Twitter image metadata while the compact navigation monogram remains readable at small sizes.
- Hero presentation: verified by generated markup and CSS; the interior concept is a responsive background, with a dark readability gradient and circularly clipped seal.
- Host canonicalization: Cloudflare Pages `_worker.js` redirects `www.marlboromanorcleaning.com` to the apex hostname with status 301 before serving assets.
- Preview test-content build: passed with pending insurance/profile wording and a global preview-only disclosure.
- Default production-safe build: confirmed pending trust language is absent when `PUBLIC_ENABLE_TEST_CONTENT` is false or unset; disclosed brand imagery remains visible.
- Deployable archive: `artifacts/Marlboro_Manor_Website_v3_Cloudflare_Pages.zip`.
- Archive SHA-256: regenerated with the final release package (see adjacent `.sha256` file).

## Manual release gates

- Cloudflare preview review
- Mobile and desktop keyboard navigation
- Chrome, Edge, Safari/iOS, and Android checks
- 200% zoom and narrow reflow
- Production `/quote` redirect
- Apex and `www` redirects
- Response headers and CSP
- Legal/policy owner review
