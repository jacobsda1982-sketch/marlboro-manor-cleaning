# Cloudflare Pages Deployment

## Prerequisites

- Git repository with V3 source
- Cloudflare account managing the domain
- Verified production business config
- Public Marble Quote Portal `/exec` URL
- Approved imagery and legal copy review status

## Git deployment

1. Push V3 to a feature branch and obtain a Cloudflare preview deployment.
2. Run acceptance tests against preview.
3. Configure the framework-specific build command and output directory documented by the implementation.
4. Add public environment variables from `config/public.env.example`; never add secrets.
5. Merge to `main` only after owner approval.
6. Verify the apex domain is canonical and `www` redirects to it.

## Required post-deploy checks

- HTTPS and redirect behavior
- All routes and 404
- Quote Portal link from every CTA
- Phone/email links
- Sitemap, robots, manifest/icons
- Structured data
- Security headers
- Mobile navigation/action bar
- No placeholder values or unverified claims
- Search Console submission/readiness
- Google Business Profile website URL update when verified

## Rollback

Use Cloudflare’s prior deployment rollback or revert the Git commit. Content/config corrections should follow the same preview → verification → production path.

