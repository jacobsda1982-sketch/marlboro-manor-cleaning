# Architecture

```text
Visitor
  → Cloudflare Pages website
      → static/indexable service and service-area pages
      → configurable Call / Email / Google Profile links
      → Request Estimate CTA
          → separate public Marble Quote Portal Apps Script URL
              → Marble Platform queue and private workflow
```

## Website responsibilities

- Brand presentation
- Search-indexable content
- Service education and scope clarity
- Factual trust evidence
- Conversion routing
- Policy disclosure
- Performance/accessibility

## Marble responsibilities

- Customer intake and validation
- Service-radius calculation
- Lead/quote generation
- Owner approval
- Quote documents and lifecycle follow-up

The website must not duplicate Marble pricing calculations or access private data. Public starting prices may be read from a local versioned content/config file until a secure publishing API is intentionally introduced.

## Rendering

All primary content routes must render meaningful HTML without requiring client JavaScript. JavaScript may enhance navigation, disclosures, analytics consent, or transitions but cannot be required to read core content or follow primary CTAs.

## Deployment

- Git repository connected to Cloudflare Pages
- Production branch: `main`
- Preview deployments for pull requests/branches
- Custom domains: apex canonical, `www` redirected to apex
- Environment variables for non-secret public configuration such as portal URL and verified profile URL

