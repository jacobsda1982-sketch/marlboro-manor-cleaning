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

test('quote calls to action stay on the branded website and launch the secure portal', () => {
  assert.match(business.quotePortalUrl, /^https:\/\/script\.google\.com\/macros\/s\//)
  pages.forEach(page => assert.match(renderPage(page), /href="\/quote\/"/))
  const quote = renderPage(pages.find(page => page.quote))
  assert.doesNotMatch(quote, /<iframe class="quote-frame"/)
  assert.match(quote, /data-conversion="quote_form_launch"/)
  assert.ok(quote.includes(business.quotePortalUrl))
})

test('unverified trust claims and telephone schema remain disabled', () => {
  assert.equal(business.claims.insured, false)
  assert.equal(business.claims.backgroundChecked, false)
  assert.equal(business.phoneE164, '')
  assert.equal(business.testContentEnabled, false)
  pages.forEach(page => {
    const html = renderPage(page)
    assert.doesNotMatch(html, /"telephone"/)
    assert.doesNotMatch(html, /five-star|background.checked|fully insured/i)
    assert.doesNotMatch(html, /Insurance documentation: verification pending/)
  })
})

test('homepage discloses concept imagery without prototype language', () => {
  const home = renderPage(pages.find(page => page.path === '/'))
  assert.match(home, /Brand concept image; not a customer home/)
  assert.doesNotMatch(home, /preview-only|policy draft|owner-reviewed workflow/i)
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
  assert.match(renderPage(pages.find(page => page.home)), /href="\/styles\.css\?v=3\.1\.0"/)
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
  assert.match(renderPage(pages.find(page => page.quote)), /rel="noopener noreferrer"/)
})

test('scheduling is website-hosted, tokenized, and excluded from search discovery', async () => {
  const page = pages.find(item => item.scheduling)
  const html = renderPage(page)
  const script = await readFile(new URL('../src/site/site.js', import.meta.url), 'utf8')
  assert.equal(page.path, '/schedule/')
  assert.equal(page.noindex, true)
  assert.match(html, /data-scheduling-frame/)
  assert.match(html, /Confirm the proposed time or choose an alternative/)
  assert.match(script, /mode=schedule&embed=1/)
  assert.match(script, /\^\[a-f0-9\]\{64\}\$/)
})
