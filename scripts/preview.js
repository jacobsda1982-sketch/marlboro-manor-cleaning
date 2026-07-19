import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('dist')
const port = Number(process.env.PORT || 4173)
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8' }

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname)
    let file = path.join(root, pathname.replace(/^\/+/, ''))
    if (pathname.endsWith('/')) file = path.join(file, 'index.html')
    else if ((await stat(file).catch(() => null))?.isDirectory()) file = path.join(file, 'index.html')
    const data = await readFile(file)
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' })
    response.end(data)
  } catch {
    const data = await readFile(path.join(root, '404.html'))
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
    response.end(data)
  }
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}`))
