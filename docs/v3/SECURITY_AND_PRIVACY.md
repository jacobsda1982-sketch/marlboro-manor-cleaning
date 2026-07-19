# Security and Privacy

- Website consumes only public configuration; no OpenAI, Google, Marble, or email credentials.
- Quote data is collected only in the separate public Marble Quote Portal.
- CSP must allow only required asset/font/portal origins.
- Add HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and frame restrictions as compatible with deployment.
- Escape/sanitize any content that can be editor-controlled.
- Avoid raw HTML rendering unless content is trusted and sanitized.
- No third-party trackers by default.
- Privacy policy must name actual processors/integrations before enabling analytics, ads, embedded maps, chat, or scheduling.
- Do not publish precise home-office address for this service-area business.
- Prevent source maps or build artifacts from exposing sensitive development information when inappropriate.
- Run secret and placeholder scans before every release.

