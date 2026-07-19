# Marlboro Manor Cleaning Website v2

Premium React/Vite website prepared for deployment through a Git repository to Cloudflare Pages.

## Cloudflare Pages build settings

- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: leave blank
- Production branch: `main`

## Local setup

```bash
npm install
npm run dev
```

## Deploy

1. Copy the contents of this package into the root of your repository.
2. Commit and push to `main`.
3. Connect the repository under Cloudflare Workers & Pages.
4. Apply the build settings above.
5. Deploy and test the assigned `pages.dev` URL.
6. Add `marlboromanorcleaning.com` and `www.marlboromanorcleaning.com` under Custom Domains.

## Quote form

The current three-step quote wizard opens the visitor's email application with their information prefilled and addressed to:

`quotes@marlboromanorcleaning.com`

This means the site does not need a Worker or Pages Function at launch. A server-side form endpoint can be added later without redesigning the site.

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
