# Test Plan

## Automated

- Type check and lint
- Unit tests for config helpers, URL creation, pricing display formatting, claim feature flags, metadata generation
- Route generation and unique metadata contract tests
- Internal/external link checks
- Structured data schema snapshots/validation
- Accessibility scans on representative routes
- Production build
- Bundle/asset size checks
- Secrets and placeholder scan

## Manual

1. Desktop and mobile navigation by keyboard/touch.
2. All CTAs with configured portal URL.
3. Portal-unavailable fallback.
4. Phone/email behavior on desktop and mobile.
5. Homepage, each service page, pricing, Upper Marlboro page, FAQ, policies, and 404.
6. Zoom to 200% and narrow viewport reflow.
7. Reduced-motion mode.
8. Images disabled/slow connection.
9. Chrome, Edge, Safari/iOS, Android Chrome.
10. Search snippet and social-share preview.
11. Structured data and sitemap/robots.
12. Cloudflare security headers and redirects.

## Launch gate review

- LLC/Google profile/phone/insurance claims match current reality.
- Imagery rights and releases documented.
- Starting prices approved.
- Marble Quote Portal production test passed.
- Privacy policy reflects actual analytics and integrations.

Record evidence in `artifacts/VERIFICATION.md`.

