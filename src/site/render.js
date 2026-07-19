import { business, pricingDisclaimer, services } from './config.js'

const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const canonical = path => `${business.origin}${path}`
const quoteLink = label => `<a class="button button-gold" href="${esc(business.quotePortalUrl)}" target="_blank" rel="noopener noreferrer">${esc(label)} <span aria-hidden="true">→</span></a>`

function serviceCards() {
  return `<div class="card-grid">${services.map(service => `<article class="card"><p class="eyebrow">Starting at ${service.price}</p><h3>${esc(service.name)}</h3><p>${esc(service.summary)}</p><a class="text-link" href="/services/${service.slug}/">Explore this service <span aria-hidden="true">→</span></a></article>`).join('')}</div>`
}

function pricingTable() {
  return `<div class="price-grid">${services.map(service => `<article class="price-card"><h2>${esc(service.name)}</h2><strong>Starting at ${esc(service.price)}</strong><p>${esc(service.summary)}</p><a href="/services/${service.slug}/">Review the scope</a></article>`).join('')}</div><p class="notice">${esc(pricingDisclaimer)}</p>`
}

function faq() {
  const items = [
    ['Do you provide supplies and equipment?', 'This claim is not published until the owner confirms the operating policy. Tell us about any specialty surfaces or requested products in the quote portal.'],
    ['Do I need to be home?', 'Not necessarily. A secure access plan must be agreed before service.'],
    ['How is the final price determined?', 'Size, layout, condition, bathrooms, access, frequency, and add-ons all affect the reviewed estimate.'],
    ['What is outside the standard scope?', 'Hazardous materials, mold remediation, pest cleanup, bodily fluids, hoarding, construction debris, junk hauling, exterior windows, and carpet extraction require separate services or review.'],
    ['Does submitting reserve a date?', 'No. A request is reviewed before price, scope, and availability are confirmed.']
  ]
  return `<div class="faq-list">${items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`
}

function sections(page) {
  return (page.sections || []).map(([heading, items]) => `<section class="content-section"><div class="content-narrow"><h2>${esc(heading)}</h2><ul class="check-list">${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div></section>`).join('')
}

function testPreviewPanel() {
  if (!business.testContentEnabled) return ''
  const insurance = business.claims.insured
    ? '<span>Insurance status: owner-verified preview claim</span>'
    : '<span>Insurance documentation: verification pending</span>'
  const profile = business.googleBusinessProfileUrl
    ? `<a href="${esc(business.googleBusinessProfileUrl)}" target="_blank" rel="noopener noreferrer">Preview Google Business Profile link</a>`
    : '<span>Google Business Profile link awaiting owner verification</span>'
  return `<aside class="test-preview" aria-label="Preview-only content"><div class="container"><strong>Preview-only test content</strong><p>Synthetic interior concepts and pending trust language are enabled for design review. They are not customer homes, completed jobs, or verified production claims.</p><div class="preview-claims">${insurance}${profile}<a href="/privacy/">Review draft policies</a></div></div></aside>`
}

function previewImagery() {
  if (!business.testContentEnabled) return ''
  return `<section class="section preview-imagery"><div class="container image-grid"><figure><img src="/images/testing/hero-synthetic-preview.webp" width="1800" height="899" alt="Synthetic preview of a calm cream and navy living room interior" loading="lazy"><figcaption>Synthetic interior concept for layout testing — not a customer home or completed job.</figcaption></figure><figure><img src="/images/testing/kitchen-synthetic-preview.webp" width="1400" height="933" alt="Synthetic preview of a bright navy and cream kitchen interior" loading="lazy"><figcaption>Synthetic interior concept for layout testing — not evidence of company work.</figcaption></figure></div></section>`
}

function policySummary() {
  return `<section class="section section-soft"><div class="container"><div class="section-heading"><div><p class="eyebrow">Clear expectations</p><h2>Policies written for review before service.</h2></div><p>Our privacy, cancellation, satisfaction, and service terms remain drafts until owner and professional review are complete.</p></div><div class="card-grid"><article class="card"><h3>Privacy and data</h3><p>The website does not directly collect quote data; the separate portal handles intake.</p><a href="/privacy/">Read the draft privacy policy</a></article><article class="card"><h3>Changes and access</h3><p>The cancellation draft explains notice, rescheduling, and no-access expectations.</p><a href="/cancellation-policy/">Read the draft cancellation policy</a></article><article class="card"><h3>Service concerns</h3><p>The satisfaction draft describes how concerns are reported and reviewed.</p><a href="/satisfaction-policy/">Read the draft satisfaction policy</a></article></div></div></section>`
}

function verifiedTrustPanel() {
  if (!business.claims.insured && !business.googleBusinessProfileUrl) return ''
  const items = []
  if (business.claims.insured) items.push('<span>Insurance status verified by owner; documentation available upon request.</span>')
  if (business.googleBusinessProfileUrl) items.push(`<a href="${esc(business.googleBusinessProfileUrl)}" target="_blank" rel="noopener noreferrer">View our verified Google Business Profile</a>`)
  return `<section class="section"><div class="container area-callout"><div><p class="eyebrow">Verified business information</p><h2>Trust details published only after owner confirmation.</h2><div class="verified-claims">${items.join('')}</div></div></div></section>`
}

function pageBody(page) {
  if (page.home) return `<section class="hero"><div class="container hero-grid"><div><p class="eyebrow">${esc(page.eyebrow)}</p><h1>${esc(page.h1)}</h1><p class="lede">${esc(page.intro)}</p><div class="actions">${quoteLink('Request an Estimate')}<a class="button button-ghost" href="/services/">Explore Services</a></div><div class="trust-row"><span>Locally owned</span><span>Clear reviewed estimates</span><span>Address-verified service area</span></div></div><div class="brand-panel" aria-hidden="true"><span>MM</span><strong>Thoughtful care.<br>Dependable systems.</strong></div></div></section><section class="section"><div class="container"><div class="section-heading"><div><p class="eyebrow">Signature services</p><h2>Residential cleaning built around your home.</h2></div><p>Choose recurring care, a detailed reset, or a move-related service.</p></div>${serviceCards()}</div></section><section class="section section-soft"><div class="container steps"><div><span>01</span><h2>Share your priorities</h2><p>Tell us about the home, condition, timing, and requested scope.</p></div><div><span>02</span><h2>Receive a reviewed estimate</h2><p>We verify the details and review the price before sending anything.</p></div><div><span>03</span><h2>Confirm the plan</h2><p>Scope and availability are agreed before service begins.</p></div></div></section><section class="section"><div class="container area-callout"><div><p class="eyebrow">Service area</p><h2>Based in Upper Marlboro. Serving qualifying homes within 25 miles.</h2><p>Every address is verified by the quote portal before it enters the private workflow.</p></div><a class="button button-outline" href="/service-areas/upper-marlboro/">Explore service areas</a></div></section>`
  if (page.services) return `${hero(page)}<section class="section"><div class="container">${serviceCards()}<p class="notice">${esc(pricingDisclaimer)}</p></div></section>`
  if (page.pricing) return `${hero(page)}<section class="section"><div class="container">${pricingTable()}</div></section>`
  if (page.faq) return `${hero(page)}<section class="section"><div class="container content-narrow">${faq()}</div></section>`
  if (page.quote) return `${hero(page)}<section class="section"><div class="container quote-panel"><div><h2>Open the secure quote application</h2><p>It opens in a new tab, verifies the property address, and sends the request into the owner-reviewed workflow.</p><ul class="check-list"><li>No appointment is created automatically.</li><li>No original quote is sent without owner approval.</li><li>No payment is collected when you submit.</li></ul></div>${quoteLink('Open Quote Portal')}</div></section>`
  if (page.contact) return `${hero(page)}<section class="section"><div class="container contact-grid"><article class="card"><h2>New estimate</h2><p>Use the secure portal so we receive the home and service details needed for review.</p>${quoteLink('Request an Estimate')}</article><article class="card"><h2>General question</h2><p><a href="mailto:${business.supportEmail}">${business.supportEmail}</a></p><p>${esc(business.hours)}</p></article></div></section>`
  return `${hero(page)}${page.price ? `<section class="price-banner"><div class="container"><strong>Starting at ${esc(page.price)}</strong><p>${esc(pricingDisclaimer)}</p></div></section>` : ''}${sections(page)}${page.notFound ? '' : `<section class="section"><div class="container final-cta"><div><p class="eyebrow">Ready to begin?</p><h2>Request a reviewed estimate for your home.</h2></div>${quoteLink('Request an Estimate')}</div></section>`}`
}

function hero(page) {
  return `<section class="page-hero"><div class="container content-narrow"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>${esc(page.h1)}</span></nav><p class="eyebrow">${esc(page.eyebrow)}</p><h1>${esc(page.h1)}</h1><p class="lede">${esc(page.intro)}</p></div></section>`
}

function structuredData(page) {
  const data = { '@context': 'https://schema.org', '@type': 'HouseCleaning', name: business.name, url: canonical(page.path), email: business.supportEmail, slogan: business.tagline, areaServed: business.areas.map(area => `${area}, Maryland`) }
  if (business.phoneE164) data.telephone = business.phoneE164
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function renderPage(page) {
  const title = `${page.title} | ${business.name}`
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(page.description)}"><link rel="canonical" href="${canonical(page.path)}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(page.description)}"><meta property="og:url" content="${canonical(page.path)}"><meta name="twitter:card" content="summary"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/styles.css"><script type="application/ld+json">${structuredData(page)}</script></head><body><a class="skip-link" href="#main">Skip to main content</a><header class="site-header"><div class="container nav-shell"><a class="brand" href="/" aria-label="${business.name} home"><span class="brand-emblem">MM</span><span><strong>Marlboro Manor</strong><small>Cleaning</small></span></a><nav class="desktop-nav" aria-label="Primary"><a href="/services/">Services</a><a href="/pricing/">Pricing</a><a href="/about/">About</a><a href="/service-areas/upper-marlboro/">Service Areas</a><a href="/faq/">FAQ</a>${quoteLink('Request Estimate')}</nav><details class="mobile-menu"><summary aria-label="Open navigation">Menu</summary><nav aria-label="Mobile"><a href="/services/">Services</a><a href="/pricing/">Pricing</a><a href="/about/">About</a><a href="/service-areas/upper-marlboro/">Service Areas</a><a href="/faq/">FAQ</a><a href="/contact/">Contact</a></nav></details></div></header>${testPreviewPanel()}<main id="main">${pageBody(page)}${page.home ? previewImagery() + policySummary() + verifiedTrustPanel() : ''}</main><footer class="footer"><div class="container footer-grid"><div><a class="brand footer-brand" href="/"><span class="brand-emblem">MM</span><span><strong>Marlboro Manor</strong><small>Cleaning</small></span></a><p>Residential cleaning with thoughtful care and dependable communication.</p></div><div><h2>Explore</h2><a href="/services/">Services</a><a href="/pricing/">Pricing</a><a href="/service-areas/upper-marlboro/">Service Areas</a><a href="/contact/">Contact</a></div><div><h2>Policies</h2><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/cancellation-policy/">Cancellation</a><a href="/satisfaction-policy/">Satisfaction</a><a href="/accessibility/">Accessibility</a></div><div><h2>Contact</h2><a href="mailto:${business.supportEmail}">${business.supportEmail}</a><p>${esc(business.hours)}</p></div></div><div class="container footer-bottom">© ${new Date().getFullYear()} ${business.name}. All rights reserved.</div></footer><div class="mobile-actions"><a href="mailto:${business.supportEmail}">Email</a><a class="primary" href="${esc(business.quotePortalUrl)}" target="_blank" rel="noopener noreferrer">Request Estimate</a></div></body></html>`
}
