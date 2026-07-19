# Implementation Requirements

## Pages and routing

Implement all required routes in `spec/routes.json` as static/indexable pages with canonical URLs, unique titles/descriptions, semantic headings, breadcrumbs where useful, and relevant CTAs.

## Navigation

- Desktop and accessible mobile navigation
- Visible Request Estimate CTA
- Visible phone link when configured
- Keyboard-operable menu with correct expanded state and focus behavior
- Skip-to-content link

## Conversion

- Primary CTA uses `PUBLIC_QUOTE_PORTAL_URL`
- If unavailable, disable the CTA with a transparent message and expose phone/email alternatives
- Mobile action bar: Call, Email/Text where configured, Request Estimate
- Track only consent-appropriate conversion events

## Contact and business data

All business facts come from a central typed config/content source. Missing data must not produce empty labels, placeholder numbers, broken links, or fabricated claims.

## SEO

- Unique metadata per route
- Canonical apex URLs
- Sitemap and robots
- Open Graph/Twitter cards
- HouseCleaning/LocalBusiness structured data using verified facts only
- Breadcrumb structured data on nested pages
- No review/rating schema without real eligible data
- Search Console verification placeholder/config

## Accessibility

- WCAG 2.2 AA target
- Semantic landmarks/headings/forms
- Keyboard navigation and visible focus
- Alternative text based on image purpose
- Contrast compliance
- Reduced motion
- Accessible disclosures/modals if any
- No color-only information
- Clear error/assistance contact

## Performance

- Optimize responsive images; prefer AVIF/WebP with fallbacks
- Avoid oversized hero assets
- Lazy-load below-fold images
- Minimize client JavaScript and third-party code
- Self-host/subset fonts where permitted
- Target Lighthouse mobile: Performance ≥90, Accessibility ≥95, Best Practices ≥95, SEO ≥95
- Core Web Vitals targets: LCP ≤2.5s, CLS ≤0.1, INP ≤200ms under reasonable field conditions

## Security/privacy

- Content Security Policy and other headers compatible with Cloudflare Pages
- No secrets in client bundle or repository
- External links secured appropriately
- Analytics disabled until configured with updated privacy disclosure/consent approach
- Legal pages labeled drafts pending professional review

## Quality

- Type checking, linting, tests, production build
- Broken-link and route checks
- Structured data validation
- HTML/headings/canonical verification
- Cross-browser and responsive manual QA

