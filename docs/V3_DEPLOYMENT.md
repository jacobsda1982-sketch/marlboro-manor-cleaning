# Website V3 Cloudflare Pages Deployment

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root
- Node version: current Cloudflare-supported LTS

`PUBLIC_QUOTE_PORTAL_URL` is public configuration, not a secret. If omitted, the build uses the current production Apps Script deployment. Set it explicitly in Cloudflare preview and production environments so deployment intent is visible.

## Preview-only content

The two AI-generated interior concepts are permanent brand-design assets. They are labeled in captions and the footer and must never be described as customer homes, completed work, or before/after evidence.

Set `PUBLIC_ENABLE_TEST_CONTENT=true` only in the Cloudflare **Preview** environment to render the yellow pending-verification disclosure. Keep it false or unset in Production.

- `PUBLIC_INSURANCE_VERIFIED=true` publishes the owner-verified insurance wording; leave false until documentation is reviewed.
- `PUBLIC_GOOGLE_BUSINESS_PROFILE_URL` publishes the verified profile link; leave blank until the listing URL and ownership are confirmed.
- If authentic permissioned photography is added later, replace these concepts deliberately and retain accurate image provenance.

Merging a reviewed pull request to `main` triggers Cloudflare Pages. Validate the branch preview first, then verify all routes, `/quote`, the apex/`www` redirect, headers, sitemap, robots, and custom 404 after deployment.

The generated `_worker.js` enforces `www.marlboromanorcleaning.com` → `marlboromanorcleaning.com` with a permanent redirect before serving static assets through Cloudflare's `ASSETS` binding. Keep the apex domain as the canonical custom domain.

Rollback through Cloudflare’s previous deployment control or revert the Git commit and redeploy.
