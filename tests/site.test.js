import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { pages } from '../src/site/pages.js'
import { renderPage } from '../src/site/render.js'
import { business } from '../src/site/config.js'

const contract = JSON.parse(await readFile(new URL('../spec/routes.json', import.meta.url)))
const routeSet = new Set(pages.map(page => page.path))

test('all contracted routes exist exactly once', () => {
  assert.deepEqual([...routeSet].sort(), [...contract.requiredRoutes].sort())
  assert.equal(routeSet.size, pages.length)
})

test('metadata, canonical URLs, and H1 content are unique', () => {
  for (const field of ['title', 'description', 'h1']) {
    assert.equal(new Set(pages.map(page => page[field])).size, pages.length, `${field} values must be unique`)
  }
  pages.forEach(page => {
    const html = renderPage(page)
    assert.match(html, new RegExp(`<link rel="canonical" href="${business.origin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
    assert.equal((html.match(/<h1/g) || []).length, 1)
  })
})

test('every rendered internal route link resolves', () => {
  const allowedAssets = new Set(['/favicon.svg', '/styles.css', '/site.js'])
  pages.forEach(page => {
    const links = [...renderPage(page).matchAll(/href="(\/[^"]*)"/g)].map(match => match[1])
    links.forEach(link => {
      const clean = link.split(/[?#]/)[0]
      if (!clean || allowedAssets.has(clean) || clean.startsWith('/images/')) return
      assert.ok(routeSet.has(clean), `${page.path} contains broken link ${clean}`)
    })
  })
})

test('quote calls to action stay on the branded website and render the native secure form', () => {
  assert.equal(business.quotePortalUrl, '/quote/')
  pages.forEach(page => assert.match(renderPage(page), /href="\/quote\/"/))
  const quote = renderPage(pages.find(page => page.quote))
  assert.doesNotMatch(quote, /<iframe class="quote-frame"/)
  assert.match(quote, /id="native-quote-form"/)
  assert.match(quote, /id="addon-blinds"/)
  assert.match(quote, /id="blindsQuantity"/)
})

test('verified insurance certificate is disclosed without activating future coverage early', () => {
  assert.equal(business.claims.insured, false)
  assert.equal(business.insurance.certificateVerified, true)
  assert.equal(business.insurance.effectiveAt, '2026-07-24T00:00:00-04:00')
  assert.equal(business.insurance.eachOccurrenceLimit, 1000000)
  assert.equal(business.insurance.aggregateLimit, 2000000)
  assert.equal(business.claims.backgroundChecked, false)
  assert.equal(business.phoneE164, '+13016603005')
  assert.equal(business.phoneDisplay, '(301) 660-3005')
  assert.equal(business.testContentEnabled, false)
  pages.forEach(page => {
    const html = renderPage(page)
    assert.match(html, /"telephone":"\+13016603005"/)
    assert.doesNotMatch(html, /five-star|background.checked|fully insured/i)
    assert.doesNotMatch(html, /Insurance documentation: verification pending/)
  })
  const home = renderPage(pages.find(page => page.home))
  assert.match(home, /Liability coverage effective July 24, 2026/)
  assert.match(home, /data-insurance-effective="2026-07-24T00:00:00-04:00"/)
})

test('business phone is consistently published for calls and structured data', () => {
  pages.forEach(page => {
    const html = renderPage(page)
    assert.match(html, /tel:\+13016603005/)
    assert.match(html, /\(301\) 660-3005/)
  })
})

test('homepage uses the approved residential gallery without legacy image notices', () => {
  const home = renderPage(pages.find(page => page.path === '/'))
  assert.match(home, /images\/gallery\/clean-living-room\.png/)
  assert.match(home, /images\/gallery\/clean-kitchen\.png/)
  assert.match(home, /images\/gallery\/clean-bathroom\.png/)
  assert.doesNotMatch(home, /concept image|preview-only|policy draft|owner-reviewed workflow/i)
})

test('approved company seal is present in hero, footer, and social metadata', () => {
  const home = renderPage(pages.find(page => page.path === '/'))
  assert.match(home, /images\/brand\/marlboro-manor-seal\.webp/)
  assert.match(home, /Marlboro Manor Cleaning seal with the tagline Come Home to Immaculate/)
  assert.match(home, /property="og:image"/)
  assert.match(home, /class="footer-seal"/)
})

test('rendered markup uses encoding-safe HTML entities for UI symbols', () => {
  pages.forEach(page => {
    const html = renderPage(page)
    assert.doesNotMatch(html, /â†’|Â©/)
    assert.doesNotMatch(html, />→</)
  })
})

test('stylesheet URL is versioned to prevent mixed production assets', () => {
  assert.match(renderPage(pages.find(page => page.home)), /href="\/styles\.css\?v=3\.6\.0"/)
})

test('service pages publish Service schema and internal pages publish breadcrumbs', () => {
  const service = renderPage(pages.find(page => page.service))
  assert.match(service, /"@type":"Service"/)
  assert.match(service, /"@type":"BreadcrumbList"/)
})

test('conversion instrumentation covers quote, email, phone, and embedded form events', async () => {
  const script = await readFile(new URL('../src/site/site.js', import.meta.url), 'utf8')
  assert.match(script, /quote_form_view/)
  assert.match(script, /marble:conversion/)
  assert.match(renderPage(pages.find(page => page.home)), /data-conversion="quote_cta"/)
})

test('public HTML includes core accessibility and security affordances', () => {
  pages.forEach(page => {
    const html = renderPage(page)
    assert.match(html, /class="skip-link"/)
    assert.match(html, /<main id="main">/)
    assert.match(html, /aria-label="Primary"/)
  })
  assert.match(renderPage(pages.find(page => page.quote)), /aria-hidden="true"/)
})

test('scheduling is website-hosted, tokenized, and excluded from search discovery', async () => {
  const page = pages.find(item => item.scheduling)
  const html = renderPage(page)
  const script = await readFile(new URL('../src/site/public-intake.js', import.meta.url), 'utf8')
  assert.equal(page.path, '/schedule/')
  assert.equal(page.noindex, true)
  assert.match(html, /id="native-scheduling"/)
  assert.match(html, /Choose your cleaning time/)
  assert.match(script, /\/api\/scheduling\?token=/)
  assert.match(script, /new URLSearchParams\(location\.search\)/)
})

test('customer forms provide guided, accessible, resumable experiences', async () => {
  const quote = renderPage(pages.find(page => page.quote))
  const scheduling = renderPage(pages.find(page => page.scheduling))
  const script = await readFile(new URL('../src/site/public-intake.js', import.meta.url), 'utf8')
  assert.match(quote, /class="quote-workspace"/)
  assert.match(quote, /Tell us about your home/)
  assert.match(quote, /class="c-summary"/)
  assert.match(quote, /id="live-quote-summary"/)
  assert.match(quote, /id="blindsQuantity"/)
  assert.match(scheduling, /aria-live="polite"/)
  assert.match(scheduling, /This private link is unique to your request/)
  assert.match(scheduling, /class="appointment-path"/)
  assert.match(script, /mmc-quote-draft/)
  assert.match(script, /Recommended option/)
})

test('crew workspace includes a private earnings wallet and payout lifecycle', async () => {
  const crew = renderPage(pages.find(page => page.crewOffer))
  const script = await readFile(new URL('../src/site/public-intake.js', import.meta.url), 'utf8')
  const worker = await readFile(new URL('../src/site/worker.js', import.meta.url), 'utf8')
  assert.match(crew, /id="crew-wallet"/)
  assert.match(crew, /Work, assignments & earnings/)
  assert.match(script, /\/api\/crew-session/)
  assert.match(script, /Available/)
  assert.match(script, /Processing/)
  assert.match(script, /Payouts/)
  assert.match(worker, /CREATE TABLE IF NOT EXISTS crew_wallets/)
  assert.match(worker, /\/api\/marble\/crew-wallet/)
})

test('secure visit preparation captures presence and pets without exposing credentials', async () => {
  const page = pages.find(item => item.preparation)
  const html = renderPage(page)
  const script = await readFile(new URL('../src/site/public-intake.js', import.meta.url), 'utf8')
  const worker = await readFile(new URL('../src/site/worker.js', import.meta.url), 'utf8')
  assert.equal(page.path, '/prepare/')
  assert.equal(page.noindex, true)
  assert.match(html, /id="preparation-form"/)
  assert.match(html, /Who will be home/)
  assert.match(html, /Pets and animal safety/)
  assert.match(html, /type="password"/)
  assert.match(script, /\/api\/preparation\?token=/)
  assert.match(worker, /AES-GCM/)
  assert.match(worker, /CREATE TABLE IF NOT EXISTS access_audit/)
  assert.match(worker, /SECURE_ACCESS_CONFIRMED/)
  assert.match(worker, /\/api\/marble\/preparation\/reveal/)
  assert.match(worker, /encrypted_credentials=NULL/)
})

test('public worker exposes signed SMS and voice intake endpoints', async () => {
  const worker = await readFile(new URL('../src/site/worker.js', import.meta.url), 'utf8')
  assert.match(worker, /version: '2\.1\.0'/)
  assert.match(worker, /\/api\/twilio\/inbound/)
  assert.match(worker, /\/api\/twilio\/voice\/inbound/)
  assert.match(worker, /\/api\/twilio\/voice\/gather/)
  assert.match(worker, /voiceWebhooks/)
})

test('selected Marble service-platform design system is shipped', async () => {
  const css = await readFile(new URL('../src/site/styles.css', import.meta.url), 'utf8')
  assert.match(css, /Marble Service Platform — Option C/)
  assert.match(css, /--navy-deep:#0b2130/)
  assert.match(css, /--gold:#c89a4b/)
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) 20\.625rem/)
  assert.match(css, /Concept C — universal public app framework/)
})
