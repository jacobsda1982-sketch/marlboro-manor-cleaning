# Marlboro Manor Cleaning Website V3

Static, indexable, dependency-free multipage website generated for Cloudflare Pages. The build creates all contracted service, service-area, conversion, and policy routes in `dist/` without requiring client JavaScript for core content.

## Cloudflare Pages build settings

- Framework preset: None
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: leave blank
- Production branch: `main`

## Local setup

```bash
npm install
npm run check
npm run build
npm run preview
```

## Deploy

1. Copy the contents of this package into the root of your repository.
2. Commit and push to `main`.
3. Connect the repository under Cloudflare Workers & Pages.
4. Apply the build settings above.
5. Deploy and test the assigned `pages.dev` URL.
6. Add `marlboromanorcleaning.com` and `www.marlboromanorcleaning.com` under Custom Domains.

## Quote portal

The website routes visitors from `/quote` and every quote call-to-action to the separately deployed public Apps Script application. Cloudflare Pages performs a temporary redirect using `public/_redirects`.

The portal source is versioned under `integrations/marble-quote-portal/`. Set `VITE_QUOTE_PORTAL_URL` in a preview environment to override the default `/quote` route when testing another deployment.

## Required pre-launch review

- Replace generated concept images with authentic company photos before paid advertising.
- Add the final business phone number in `src/data/site.js`.
- Verify service areas, business hours, prices, and policies.
- Obtain legal review of privacy and service terms before accepting paid bookings.
- Review pricing after the first 10–20 jobs.
- Add Google Analytics or another analytics tool only after deciding on privacy and consent practices.

## Architecture

- React 19
- Vite 6
- Responsive custom CSS
- Lucide icons
- Static Cloudflare Pages deployment
- No server-side functions required
- No proprietary site-builder lock-in
