import { business, pricingDisclaimer, services } from './config.js'

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const canonical = path => `${business.origin}${path}`
const quoteLink = (label, className = 'button button-gold') => `<a class="${className}" href="/quote/" data-conversion="quote_cta">${esc(label)} <span aria-hidden="true">&rarr;</span></a>`

function serviceCards() {
  return `<div class="card-grid service-grid">${services.map(service => `<article class="card service-card"><p class="eyebrow">Starting at ${esc(service.price)}</p><h3>${esc(service.name)}</h3><p>${esc(service.summary)}</p><ul class="mini-list">${service.includes.slice(0, 3).map(item => `<li>${esc(item)}</li>`).join('')}</ul><a class="text-link" href="/services/${service.slug}/">Explore ${esc(service.searchName.toLowerCase())} <span aria-hidden="true">&rarr;</span></a></article>`).join('')}</div>`
}

function pricingTable() {
  return `<div class="price-grid">${services.map(service => `<article class="price-card"><p class="eyebrow">${esc(service.searchName)}</p><h2>${esc(service.name)}</h2><strong>Starting at ${esc(service.price)}</strong><p>${esc(service.summary)}</p><a href="/services/${service.slug}/">Review the included scope</a></article>`).join('')}</div><p class="notice">${esc(pricingDisclaimer)}</p>`
}

function faq() {
  const items = [
    ['Do you bring cleaning supplies and equipment?', business.claims.suppliesProvided ? 'Yes. Our team arrives with the standard products and equipment needed for the accepted scope. Tell us about specialty surfaces or product sensitivities in the estimate form.' : 'Please describe specialty surfaces and product sensitivities in the estimate form. The supplies and equipment plan will be confirmed with your estimate.'],
    ['Do I need to be home?', 'Not necessarily. A secure property-access plan must be agreed before the appointment.'],
    ['How is the final price determined?', 'The home size, layout, condition, bathrooms, access, frequency, pets, and add-ons all affect the personalized estimate.'],
    ['Can I request recurring service?', 'Yes. Weekly, biweekly, and every-four-week options are available for qualifying homes. A detail clean may be recommended before recurring service begins.'],
    ['What is outside the standard scope?', 'Hazardous materials, mold remediation, pest cleanup, bodily fluids, hoarding, construction debris, junk hauling, exterior windows, and carpet extraction require another qualified provider or separate review.'],
    ['Does submitting the form reserve a date?', 'No. Your address, scope, estimate, and availability are confirmed before an appointment is reserved.']
  ]
  return `<div class="faq-list">${items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>`
}

function sections(page) {
  return (page.sections || []).map(([heading, items]) => `<section class="content-section"><div class="content-narrow"><h2>${esc(heading)}</h2><ul class="check-list">${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul></div></section>`).join('')
}

function trustItems() {
  const items = ['Locally owned', 'Personalized estimates', 'Address-verified service area']
  if (business.claims.insured) items.push('Insurance verified')
  if (business.claims.backgroundChecked) items.push('Background checks verified')
  return items
}

function trustSection() {
  return `<section class="trust-band" aria-label="Why choose Marlboro Manor Cleaning"><div class="container trust-band-grid">${trustItems().map(item => `<div><span aria-hidden="true">&#10003;</span><strong>${esc(item)}</strong></div>`).join('')}</div></section>`
}

function proofSection() {
  if (business.googleBusinessProfileUrl) {
    return `<section class="section"><div class="container proof-card"><div><p class="eyebrow">Local reputation</p><h2>See what customers are saying on Google.</h2><p>Read verified feedback and view current business information on our Google Business Profile.</p></div><a class="button button-outline" href="${esc(business.googleBusinessProfileUrl)}" target="_blank" rel="noopener noreferrer" data-conversion="google_profile">View Google Profile</a></div></section>`
  }
  return `<section class="section"><div class="container proof-card"><div><p class="eyebrow">A reputation built carefully</p><h2>Clear expectations before the first visit.</h2><p>Every estimate defines the requested scope, pricing assumptions, and next step before an appointment is confirmed.</p></div>${quoteLink('Get My Estimate', 'button button-outline')}</div></section>`
}

function brandImagery() {
  return `<section class="section brand-imagery" aria-labelledby="brand-imagery-title"><div class="container"><div class="section-heading"><div><p class="eyebrow">The Marlboro Manor standard</p><h2 id="brand-imagery-title">Calm spaces. Thoughtful details.</h2></div><p>Our brand is designed around the feeling of returning to a home that has been carefully reset.</p></div><div class="image-grid"><figure><img src="/images/testing/hero-synthetic-preview.webp" width="1800" height="899" alt="Bright, calm living room in the Marlboro Manor navy and cream brand palette" loading="lazy" decoding="async"><figcaption>Brand concept image; not a customer home.</figcaption></figure><figure><img src="/images/testing/kitchen-synthetic-preview.webp" width="1400" height="933" alt="Bright kitchen in the Marlboro Manor navy and cream brand palette" loading="lazy" decoding="async"><figcaption>Brand concept image; not evidence of completed work.</figcaption></figure></div></div></section>`
}

function policySummary() {
  return `<section class="section section-soft"><div class="container"><div class="section-heading"><div><p class="eyebrow">Clear expectations</p><h2>Know what happens before service begins.</h2></div><p>Our policies explain information handling, appointment changes, and how service concerns are reviewed.</p></div><div class="card-grid policy-grid"><article class="card"><h3>Privacy and data</h3><p>Understand how estimate, property, and payment information is handled.</p><a href="/privacy/">Read the privacy policy</a></article><article class="card"><h3>Changes and access</h3><p>Review appointment-change and property-access expectations.</p><a href="/cancellation-policy/">Read the cancellation policy</a></article><article class="card"><h3>Service concerns</h3><p>See how an issue within the accepted scope is documented and reviewed.</p><a href="/satisfaction-policy/">Read the satisfaction policy</a></article></div></div></section>`
}

function quoteExperience() {
  return `<section class="section quote-experience"><div class="container"><div class="quote-intro"><div><p class="eyebrow">Secure estimate request</p><h2>One form. A clear next step.</h2><p>The embedded application verifies the service area and sends your property details securely to Marlboro Manor Cleaning. No payment is collected and no appointment is created at submission.</p></div><div class="quote-benefits"><span>About five minutes</span><span>Draft saves automatically</span><span>Mobile friendly</span></div></div><div class="quote-frame-shell"><iframe class="quote-frame" src="${esc(business.quotePortalUrl)}" title="Marlboro Manor Cleaning estimate request" loading="eager" referrerpolicy="strict-origin-when-cross-origin"></iframe><p class="quote-fallback">Having trouble with the embedded form? <a href="${esc(business.quotePortalUrl)}" target="_blank" rel="noopener noreferrer" data-conversion="quote_fallback">Open the secure estimate form in a new tab</a>.</p></div></div></section>`
}

function schedulingExperience() {
  return `<section class="section scheduling-experience"><div class="container scheduling-shell"><div class="scheduling-context"><p class="eyebrow">Your appointment</p><h2>Confirm the proposed time or choose an alternative.</h2><p>Your secure link connects this page to the appointment choices prepared for your accepted estimate. The selection remains subject to a final availability check.</p><ul><li>No account required</li><li>No payment collected here</li><li>Email confirmation follows</li></ul></div><div class="scheduling-frame-shell"><div id="schedule-message" class="schedule-message" role="status">Loading your secure scheduling form&hellip;</div><iframe class="scheduling-frame" title="Marlboro Manor Cleaning appointment selection" data-scheduling-frame data-backend="${esc(business.schedulingPortalBackendUrl)}" loading="eager" referrerpolicy="no-referrer"></iframe><p class="quote-fallback">If the form does not load, reply to your scheduling email or contact <a href="mailto:scheduling@marlboromanorcleaning.com">scheduling@marlboromanorcleaning.com</a>.</p></div></div></section>`
}

function pageBody(page) {
  if (page.home) return `<section class="hero"><div class="container hero-grid"><div><p class="eyebrow">${esc(page.eyebrow)}</p><h1>${esc(page.h1)}</h1><p class="hero-kicker">House cleaning in Upper Marlboro, Maryland</p><p class="lede">${esc(page.intro)}</p><div class="actions">${quoteLink('Get My Cleaning Estimate')}<a class="button button-ghost" href="/services/">Explore Services</a></div><p class="microcopy">No payment required to request an estimate.</p></div><div class="brand-panel"><img src="/images/brand/marlboro-manor-seal.webp" width="720" height="720" alt="Marlboro Manor Cleaning seal with the tagline Come Home to Immaculate" fetchpriority="high"></div></div></section>${trustSection()}<section class="section"><div class="container"><div class="section-heading"><div><p class="eyebrow">Signature services</p><h2>Residential cleaning built around your home.</h2></div><p>Choose dependable recurring care, a detailed reset, or move-related cleaning.</p></div>${serviceCards()}</div></section><section class="section section-soft"><div class="container"><div class="section-heading"><div><p class="eyebrow">Simple from the start</p><h2>From your priorities to a confirmed plan.</h2></div></div><div class="steps"><div><span>01</span><h3>Share your home details</h3><p>Tell us about the property, condition, timing, pets, and requested scope.</p></div><div><span>02</span><h3>Receive your estimate</h3><p>We verify the details and prepare a personalized scope and price.</p></div><div><span>03</span><h3>Choose an available time</h3><p>Accept the estimate, review scheduling options, and confirm the appointment.</p></div></div></div></section>${proofSection()}<section class="section"><div class="container area-callout"><div><p class="eyebrow">Service area</p><h2>Based in Upper Marlboro. Serving qualifying homes within 25 miles.</h2><p>Every full address is checked before the estimate request is accepted.</p></div><a class="button button-outline" href="/service-areas/upper-marlboro/">Explore Service Areas</a></div></section>`
  if (page.services) return `${hero(page)}<section class="section"><div class="container">${serviceCards()}<p class="notice">${esc(pricingDisclaimer)}</p></div></section>`
  if (page.pricing) return `${hero(page)}<section class="section"><div class="container">${pricingTable()}</div></section>`
  if (page.faq) return `${hero(page)}<section class="section"><div class="container content-narrow">${faq()}</div></section>`
  if (page.quote) return `${hero(page)}${quoteExperience()}`
  if (page.scheduling) return `${hero(page)}${schedulingExperience()}`
  if (page.contact) return `${hero(page)}<section class="section"><div class="container contact-grid"><article class="card"><h2>New estimate</h2><p>Use the guided estimate form so we receive the property and scope details needed to help.</p>${quoteLink('Get My Estimate')}</article><article class="card"><h2>General question</h2><p><a href="mailto:${esc(business.supportEmail)}" data-conversion="email">${esc(business.supportEmail)}</a></p>${business.phoneDisplay ? `<p><a href="tel:${esc(business.phoneE164)}" data-conversion="phone">${esc(business.phoneDisplay)}</a></p>` : ''}<p>${esc(business.hours)}</p></article></div></section>`
  return `${hero(page)}${page.price ? `<section class="price-banner"><div class="container"><strong>Starting at ${esc(page.price)}</strong><p>${esc(pricingDisclaimer)}</p></div></section>` : ''}${sections(page)}${page.notFound ? '' : `<section class="section"><div class="container final-cta"><div><p class="eyebrow">Ready to begin?</p><h2>Request a personalized estimate for your home.</h2></div>${quoteLink('Get My Estimate')}</div></section>`}`
}

function hero(page) {
  return `<section class="page-hero"><div class="container content-narrow"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">${esc(page.h1)}</span></nav><p class="eyebrow">${esc(page.eyebrow)}</p><h1>${esc(page.h1)}</h1><p class="lede">${esc(page.intro)}</p></div></section>`
}

function structuredData(page) {
  const businessData = { '@type': 'HouseCleaning', '@id': `${business.origin}/#business`, name: business.name, url: business.origin, logo: `${business.origin}/images/brand/marlboro-manor-seal.webp`, email: business.supportEmail, slogan: business.tagline, priceRange: '$$', areaServed: business.areas.map(name => ({ '@type': 'City', name: `${name}, Maryland` })) }
  if (business.phoneE164) businessData.telephone = business.phoneE164
  if (business.googleBusinessProfileUrl) businessData.sameAs = [business.googleBusinessProfileUrl]
  const graph = [businessData]
  if (page.path !== '/') graph.push({ '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: business.origin }, { '@type': 'ListItem', position: 2, name: page.h1, item: canonical(page.path) }] })
  if (page.service) graph.push({ '@type': 'Service', name: page.service.searchName, serviceType: page.service.name, provider: { '@id': `${business.origin}/#business` }, areaServed: business.areas.map(name => `${name}, Maryland`), description: page.service.summary, offers: { '@type': 'Offer', priceCurrency: 'USD', price: page.service.price.replace(/[^0-9.]/g, ''), description: pricingDisclaimer, url: canonical(page.path) } })
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')
}

function analyticsHead() {
  if (!business.analyticsId) return ''
  const id = esc(business.analyticsId)
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${id}',{anonymize_ip:true});</script>`
}

export function renderPage(page) {
  const title = `${page.title} | ${business.name}`
  const currentYear = new Date().getFullYear()
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(page.description)}"><link rel="canonical" href="${canonical(page.path)}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(page.description)}"><meta property="og:url" content="${canonical(page.path)}"><meta property="og:image" content="${business.origin}/images/brand/marlboro-manor-seal.webp"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${business.origin}/images/brand/marlboro-manor-seal.webp"><meta name="theme-color" content="#142642"><link rel="icon" href="/favicon.svg"><link rel="preload" href="/images/testing/hero-synthetic-preview.webp" as="image" fetchpriority="high"><link rel="stylesheet" href="/styles.css?v=3.1.0">${analyticsHead()}<script type="application/ld+json">${structuredData(page)}</script><script src="/site.js" defer></script></head><body data-page="${esc(page.path)}"><a class="skip-link" href="#main">Skip to main content</a><header class="site-header"><div class="container nav-shell"><a class="brand" href="/" aria-label="${business.name} home"><span class="brand-emblem">MM</span><span><strong>Marlboro Manor</strong><small>Cleaning</small></span></a><nav class="desktop-nav" aria-label="Primary"><a href="/services/">Services</a><a href="/pricing/">Pricing</a><a href="/about/">About</a><a href="/service-areas/upper-marlboro/">Service Areas</a><a href="/faq/">FAQ</a>${quoteLink('Get Estimate')}</nav><details class="mobile-menu"><summary aria-label="Open navigation">Menu</summary><nav aria-label="Mobile"><a href="/services/">Services</a><a href="/pricing/">Pricing</a><a href="/about/">About</a><a href="/service-areas/upper-marlboro/">Service Areas</a><a href="/faq/">FAQ</a><a href="/contact/">Contact</a><a href="/quote/">Get Estimate</a></nav></details></div></header><main id="main">${pageBody(page)}${page.home ? brandImagery() + policySummary() : ''}</main><footer class="footer"><div class="container footer-grid"><div><img class="footer-seal" src="/images/brand/marlboro-manor-seal.webp" width="720" height="720" alt=""><a class="brand footer-brand" href="/"><span class="brand-emblem">MM</span><span><strong>Marlboro Manor</strong><small>Cleaning</small></span></a><p>Premium residential cleaning with thoughtful care and dependable communication.</p></div><div><h2>Explore</h2><a href="/services/">Services</a><a href="/pricing/">Pricing</a><a href="/service-areas/upper-marlboro/">Service Areas</a><a href="/contact/">Contact</a></div><div><h2>Policies</h2><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/cancellation-policy/">Cancellation</a><a href="/satisfaction-policy/">Satisfaction</a><a href="/accessibility/">Accessibility</a></div><div><h2>Contact</h2><a href="mailto:${esc(business.supportEmail)}" data-conversion="email">${esc(business.supportEmail)}</a>${business.phoneDisplay ? `<a href="tel:${esc(business.phoneE164)}" data-conversion="phone">${esc(business.phoneDisplay)}</a>` : ''}<p>${esc(business.hours)}</p></div></div><div class="container footer-bottom">&copy; ${currentYear} ${business.name}. All rights reserved. <span>Concept imagery is disclosed where shown.</span></div></footer><div class="mobile-actions">${business.phoneDisplay ? `<a href="tel:${esc(business.phoneE164)}" data-conversion="phone">Call</a>` : `<a href="mailto:${esc(business.supportEmail)}" data-conversion="email">Email</a>`}<a class="primary" href="/quote/" data-conversion="quote_cta">Get Estimate</a></div></body></html>`
}
