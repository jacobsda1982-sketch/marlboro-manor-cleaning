import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pages } from '../src/site/pages.js'
import { renderPage } from '../src/site/render.js'
import { business } from '../src/site/config.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })
await cp(path.join(root, 'public'), dist, { recursive: true })
await cp(path.join(root, 'src', 'site', 'styles.css'), path.join(dist, 'styles.css'))
await cp(path.join(root, 'src', 'site', 'site.js'), path.join(dist, 'site.js'))

for (const page of pages) {
  const destination = page.path === '/404.html'
    ? path.join(dist, '404.html')
    : page.path === '/'
      ? path.join(dist, 'index.html')
      : path.join(dist, page.path.slice(1), 'index.html')
  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, renderPage(page), 'utf8')
}

const sitemap = pages.filter(page => page.path !== '/404.html' && !page.noindex).map(page => `  <url><loc>${business.origin}${page.path}</loc></url>`).join('\n')
await writeFile(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap}\n</urlset>\n`)
await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /schedule/\nSitemap: ${business.origin}/sitemap.xml\n`)

const redirects = `https://www.marlboromanorcleaning.com/* https://marlboromanorcleaning.com/:splat 301\n`
await writeFile(path.join(dist, '_redirects'), redirects)
await writeFile(path.join(dist, '_worker.js'), `export default {\n  async fetch(request, env) {\n    const url = new URL(request.url)\n    if (url.hostname === 'www.marlboromanorcleaning.com') {\n      url.hostname = 'marlboromanorcleaning.com'\n      return Response.redirect(url.toString(), 301)\n    }\n    return env.ASSETS.fetch(request)\n  }\n}\n`)
await mkdir(path.join(dist, 'server'), { recursive: true })
await writeFile(path.join(dist, 'server', 'index.js'), `export default {\n  async fetch(request, env) {\n    const url = new URL(request.url)\n    if (url.hostname === 'www.marlboromanorcleaning.com') {\n      url.hostname = 'marlboromanorcleaning.com'\n      return Response.redirect(url.toString(), 301)\n    }\n    return env.ASSETS.fetch(request)\n  }\n}\n`)

const files = ['index.html', 'styles.css', 'site.js', 'sitemap.xml', 'robots.txt', '_headers', '_redirects', '_worker.js']
const checksums = {}
for (const file of files) checksums[file] = createHash('sha256').update(await readFile(path.join(dist, file))).digest('hex')
await writeFile(path.join(dist, 'release-manifest.json'), JSON.stringify({ version: '3.1.0', generatedAt: new Date().toISOString(), routeCount: pages.length, checksums }, null, 2))
console.log(`Built ${pages.length} static routes in dist/`)
