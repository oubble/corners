// Static server. `node scripts/serve.mjs` serves the repository for the browser
// tests (`?csp` adds a strict policy); `node scripts/serve.mjs site` serves the
// assembled lab exactly as production does, headers and redirect included,
// with the shared fonts fetched from production when they are not on disk.

import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const repository = fileURLToPath(new URL('..', import.meta.url))
const site = process.argv[2] === 'site'
const root = site ? join(repository, 'site') : repository
const port = Number(process.env.PORT ?? (site ? 4174 : 4173))
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
}
const STRICT_CSP = "default-src 'self'; script-src 'self'; style-src 'self'"

/** Parses the `/*` block of a Cloudflare `_headers` file. */
async function productionHeaders() {
  if (!site) return {}
  const text = await readFile(join(root, '_headers'), 'utf8')
  return Object.fromEntries(
    text
      .split('\n')
      .filter((line) => line.startsWith('  ') && line.includes(':'))
      .map((line) => {
        const at = line.indexOf(':')
        return [line.slice(0, at).trim(), line.slice(at + 1).trim()]
      }),
  )
}

const shared = await productionHeaders()

createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://localhost')
  if (url.pathname === '/') {
    response.writeHead(302, { location: site ? '/capsule/' : '/test/fixtures/' }).end()
    return
  }
  const relative = normalize(decodeURIComponent(url.pathname)).replace(/[/\\]$/, `${sep}index.html`)
  const file = join(root, relative)
  if (!file.startsWith(root)) {
    response.writeHead(403).end()
    return
  }
  try {
    const body = await readFile(file)
    const headers = {
      ...shared,
      'content-type': types[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    }
    if (url.searchParams.has('csp')) headers['content-security-policy'] = STRICT_CSP
    response.writeHead(200, headers).end(body)
  } catch {
    // The lab's fonts live in their own Worker (lab.oubble.com/fonts).
    if (site && url.pathname.startsWith('/fonts/')) {
      const remote = await fetch(`https://lab.oubble.com${url.pathname}`)
      if (remote.ok) {
        response
          .writeHead(200, { ...shared, 'content-type': types['.woff2'] })
          .end(Buffer.from(await remote.arrayBuffer()))
        return
      }
    }
    response.writeHead(404).end()
  }
}).listen(port, () => console.log(`http://localhost:${port}${site ? '/capsule/' : '/'}`))
