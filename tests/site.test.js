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
  const allowedAssets = new Set(['/favicon.svg', '/styles.css'])
  pages.forEach(page => {
    const links = [...renderPage(page).matchAll(/href="(\/[^"]*)"/g)].map(match => match[1])
    links.forEach(link => {
      const clean = link.split(/[?#]/)[0]
      if (!clean || allowedAssets.has(clean)) return
      assert.ok(routeSet.has(clean), `${page.path} contains broken link ${clean}`)
    })
  })
})

test('quote calls to action use the separate public portal', () => {
  assert.match(business.quotePortalUrl, /^https:\/\/script\.google\.com\/macros\/s\//)
  pages.forEach(page => assert.ok(renderPage(page).includes(business.quotePortalUrl)))
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

test('homepage permanently includes disclosed synthetic brand imagery', () => {
  const home = renderPage(pages.find(page => page.path === '/'))
  assert.match(home, /AI-generated Marlboro Manor brand concept/)
  assert.match(home, /not a customer home or completed job/)
  assert.match(home, /brand-image-mark/)
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
  assert.match(renderPage(pages.find(page => page.home)), /href="\/styles\.css\?v=3\.0\.1"/)
})

test('public HTML includes core accessibility and security affordances', () => {
  pages.forEach(page => {
    const html = renderPage(page)
    assert.match(html, /class="skip-link"/)
    assert.match(html, /<main id="main">/)
    assert.match(html, /aria-label="Primary"/)
    assert.match(html, /rel="noopener noreferrer"/)
  })
})
