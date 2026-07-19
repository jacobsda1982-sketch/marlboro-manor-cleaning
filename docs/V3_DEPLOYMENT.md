# Website V3 Cloudflare Pages Deployment

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: repository root
- Node version: current Cloudflare-supported LTS

`PUBLIC_QUOTE_PORTAL_URL` is public configuration, not a secret. If omitted, the build uses the current production Apps Script deployment. Set it explicitly in Cloudflare preview and production environments so deployment intent is visible.

Merging a reviewed pull request to `main` triggers Cloudflare Pages. Validate the branch preview first, then verify all routes, `/quote`, the apex/`www` redirect, headers, sitemap, robots, and custom 404 after deployment.

Rollback through Cloudflare’s previous deployment control or revert the Git commit and redeploy.
