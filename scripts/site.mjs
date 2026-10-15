// Assembles the lab.oubble.com bundle in site/: the lab under /capsule/, the
// built package and llms.txt beside it, and the security headers the
// host applies.

import { cp, mkdir, rm, writeFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const site = new URL('site/', root)
const lab = new URL('capsule/', site)

const HEADERS = `/*
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=63072000; includeSubDomains
  X-Content-Type-Options: nosniff
`

await rm(site, { recursive: true, force: true })
await mkdir(lab, { recursive: true })
await cp(new URL('demo/', root), lab, { recursive: true })
await cp(new URL('dist/', root), new URL('dist/', lab), {
  recursive: true,
  filter: (source) => !source.endsWith('.d.ts'),
})
await cp(new URL('llms.txt', root), new URL('llms.txt', lab))
await writeFile(new URL('_headers', site), HEADERS)
console.log('site/ assembled')
