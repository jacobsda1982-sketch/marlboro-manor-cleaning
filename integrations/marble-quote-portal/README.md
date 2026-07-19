# Marble Quote Portal

This directory stores the source for the separate public Google Apps Script quote application used by the Cloudflare Pages website.

## Website integration

- Visitors enter through `/quote` or any **Request a Quote** button.
- Cloudflare Pages redirects `/quote` to the production Apps Script web deployment.
- `VITE_QUOTE_PORTAL_URL` may override `/quote` for preview or test deployments.
- The portal is intentionally opened as a separate secure application. Its default Apps Script frame policy is preserved.

## Apps Script deployment

The `src/` files and `appsscript.json` form the standalone public Apps Script project. Deploy it separately from the private owner application. Never add Gmail, Drive, OpenAI, pricing administration, or approval capabilities to this public project.

Production deployment:

`https://script.google.com/macros/s/AKfycbwJ1V-ZHauLWg3qpIAnw8EsGiiuPnhXOFakBokqO_GUUBrTE08Rhfz44__XdZVDGbkeFA/exec`
