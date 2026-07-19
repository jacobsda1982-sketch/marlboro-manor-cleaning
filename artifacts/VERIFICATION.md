# Website V3 Verification

## Scope

Website V3 replaces the client-rendered V2 prototype with a generated static multipage site for Cloudflare Pages. The separate public Marble Quote Portal remains the only quote-data collection surface.

## Safety decisions

- Phone links are omitted until a verified number is supplied.
- Insurance, background-check, supplies, review, rating, staff, vehicle, and completed-job claims remain disabled.
- No analytics or third-party trackers are enabled.
- Policy pages are visibly described as drafts pending professional review.
- Existing concept images remain in the repository for history but are not rendered by V3.

## Automated evidence

Executed with bundled Node on 2026-07-19:

- Contracted route test: passed.
- Unique title, description, canonical URL, and H1 test: passed.
- Internal route-link test: passed with zero broken route links.
- Separate public portal CTA test: passed across all routes.
- Unverified-claim and telephone-schema guard: passed.
- Core HTML accessibility/security affordance test: passed.
- Automated total: **6 passed, 0 failed**.
- Production build: passed; **22 static routes** generated in `dist/`.
- Browser rendering: passed for the homepage, detail-cleaning service page, Bowie service-area page, privacy-policy draft, and custom 404.
- Representative pages exposed one H1, unique document titles, primary navigation, and the public portal CTA.
- Preview test-content build: passed with two optimized synthetic WebP concepts, visible synthetic-image captions, pending insurance/profile wording, and a global preview-only disclosure.
- Default production-safe build: confirmed that synthetic imagery and pending trust language are absent when `PUBLIC_ENABLE_TEST_CONTENT` is false or unset.
- Deployable archive: `artifacts/Marlboro_Manor_Website_v3_Cloudflare_Pages.zip`.
- Archive SHA-256: `7425ea3fa647e8333c4bf49bace49cb6a0b083eaabbda72dc17d9d49e964af70`.

## Manual release gates

- Cloudflare preview review
- Mobile and desktop keyboard navigation
- Chrome, Edge, Safari/iOS, and Android checks
- 200% zoom and narrow reflow
- Production `/quote` redirect
- Apex and `www` redirects
- Response headers and CSP
- Legal/policy owner review
