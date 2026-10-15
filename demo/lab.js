import { capsulePath, mount, observe, roundedPath, unmount } from './dist/core.js'

// Mirror diagnostics on the page, one row per warning: code, message, docs.
const panel = document.getElementById('diagnostics')
const warnings = document.getElementById('warnings')
const warn = console.warn.bind(console)
console.warn = (...args) => {
  warn(...args)
  const text = args.find((arg) => typeof arg === 'string') ?? ''
  const match = /(OUB\d+): (.*?)\s*(https:\S+)?$/s.exec(text)
  if (!match) return
  const [, code, message, link] = match
  const row = document.createElement('li')
  row.append(
    Object.assign(document.createElement('span'), { className: 'code', textContent: code }),
    Object.assign(document.createElement('p'), { textContent: message }),
  )
  if (link) row.append(Object.assign(document.createElement('a'), { href: link, textContent: 'Docs ↗' }))
  warnings.append(row)
  panel.hidden = false
}
observe()

setTimeout(() => {
  const button = Object.assign(document.createElement('button'), {
    type: 'button',
    className: 'graphite',
    textContent: 'Born later',
  })
  button.dataset.corners = ''
  document.getElementById('late').append(button)
}, 1500)

const target = document.getElementById('target')
const toggle = document.getElementById('toggle')
toggle.addEventListener('click', () => {
  const mounted = target.hasAttribute('data-corners-state')
  if (mounted) {
    target.removeAttribute('data-corners')
    unmount(target)
  } else {
    target.setAttribute('data-corners', '')
    mount(target)
  }
  toggle.textContent = mounted ? 'Mount' : 'Unmount'
})

// A real anchor, kept from navigating so the page stays put.
document.getElementById('anchor').addEventListener('click', (event) => event.preventDefault())

const install = document.getElementById('install')
const installState = install.querySelector('.install-state')
let installReset = 0
install.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText('npm i @oubble/corners')
    install.dataset.copied = ''
    installState.textContent = 'Copied'
  } catch {
    installState.textContent = 'Select it'
  }
  clearTimeout(installReset)
  installReset = setTimeout(() => {
    delete install.dataset.copied
    installState.textContent = 'Copy'
  }, 1800)
})

// ── Deviation ───────────────────────────────────────────────────────
// Each window spans the corner from 0.45R to 1.5R along the edge, magnified
// more in depth than along it so a sub-pixel gap reads.
const NS = 'http://www.w3.org/2000/svg'
const SPECIMENS = [
  ['Ok', 84, 36],
  ['Continue', 140, 44],
  ['Add to bag', 196, 52],
]
const WINDOW = [240, 100]

const node = (name, attributes, parent) => {
  const element = document.createElementNS(NS, name)
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value)
  parent.append(element)
  return element
}

/** border-radius: 50% with the same command sequence as capsulePath. */
function radiusPath(width, height) {
  const r = height / 2
  const k = (4 / 3) * Math.tan(Math.PI / 8) * r
  return `M ${width - r} 0 H ${r} C ${r - k} 0 0 ${r - k} 0 ${r} C 0 ${r + k} ${r - k} ${height} ${r} ${height} H ${width - r} C ${width - r + k} ${height} ${width} ${r + k} ${width} ${r} C ${width} ${r - k} ${width - r + k} 0 ${width - r} 0 Z`
}

/**
 * A real-size element above, one corner magnified below: the window spans the
 * corner from 0.45R to 1.7R along the edge and is stretched in depth so a
 * sub-pixel gap reads. Gold is the area between border-radius and the shape.
 */
function specimen(parent, element, r, plain, shape, caption) {
  const [x0, x1, y0, y1] = [0.45 * r, 1.7 * r, -0.012 * r, 0.12 * r]
  const sx = WINDOW[0] / (x1 - x0)
  const sy = WINDOW[1] / (y1 - y0)
  const cell = Object.assign(document.createElement('div'), { className: 'cell specimen' })
  const svg = node(
    'svg',
    { viewBox: `0 0 ${WINDOW.join(' ')}`, role: 'img', 'aria-label': `${caption}, corner magnified` },
    cell,
  )
  const group = node('g', { transform: `scale(${sx} ${sy}) translate(${-x0} ${-y0})` }, svg)
  node('path', { class: 'inside', d: shape }, group)
  node('path', { class: 'gap', d: `${plain} ${shape}` }, group)
  node('path', { class: 'radius', d: plain }, group)
  node('path', { class: 'outline', d: shape }, group)
  cell.prepend(element)
  cell.append(
    Object.assign(document.createElement('span'), {
      className: 'label',
      textContent: `${caption}, magnified ×${Math.round(sx)} along and ×${Math.round(sy)} deep.`,
    }),
  )
  parent.append(cell)
}

function sized(element, w, h) {
  element.dataset.corners = ''
  element.style.setProperty('width', `${w}px`)
  element.style.setProperty('height', `${h}px`)
  return element
}

const deviation = document.getElementById('deviation')
for (const [label, w, h] of SPECIMENS) {
  const button = sized(
    Object.assign(document.createElement('button'), {
      type: 'button',
      className: 'cream',
      textContent: label,
    }),
    w,
    h,
  )
  button.style.setProperty('padding', '0')
  specimen(deviation, button, h / 2, radiusPath(w, h), capsulePath(w, h), `${w} × ${h}`)
}

// Partial radii: the same reading against a continuous corner of that radius.
const TILES = [
  ['App icon', 96, 96, 21.5],
  ['Card', 220, 132, 24],
  ['Button', 168, 48, 12],
]
const corners = document.getElementById('corners')
for (const [label, w, h, r] of TILES) {
  const tile = sized(
    Object.assign(document.createElement('div'), { className: 'tile', textContent: label }),
    w,
    h,
  )
  tile.style.setProperty('border-radius', `${r}px`)
  specimen(corners, tile, r, roundedPath(w, h, r, 0), roundedPath(w, h, r), `${w} × ${h}, radius ${r}px`)
}

// ── Closing ─────────────────────────────────────────────────────────
// oubble.com's closing block: 60 rows × 80 glyphs of ".+.--..:*:" shifted one
// glyph per row at 7%, ~2.9% of them twinkling in the accent tones. Same seed
// as the site, so the field is the same one.
const PATTERN = '.+.--..:*:'
const ROWS = 60
const COLS = 80
const TWINKLE_RATE = 139 / (ROWS * COLS)
const TONES = ['--tone-1', '--tone-1', '--tone-2', '--tone-4', '--tone-5']

function seeded(seed) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const field = document.getElementById('field')
const random = seeded(20260706)
for (let row = 0; row < ROWS; row += 1) {
  const line = document.createElement('div')
  let plain = ''
  const flush = () => {
    if (!plain) return
    line.append(
      Object.assign(document.createElement('span'), { className: 'final-cta__dim', textContent: plain }),
    )
    plain = ''
  }
  for (let col = 0; col < COLS; col += 1) {
    const glyph = PATTERN[(((col - row) % PATTERN.length) + PATTERN.length) % PATTERN.length]
    if (random() < TWINKLE_RATE) {
      flush()
      const duration = 1.4 + random() * 3.5
      const span = Object.assign(document.createElement('span'), {
        className: 'final-cta__twinkle',
        textContent: glyph,
      })
      span.style.setProperty('color', `var(${TONES[Math.floor(random() * TONES.length)]})`)
      span.style.setProperty('animation-delay', `${(-random() * duration).toFixed(2)}s`)
      span.style.setProperty('--peak', (0.58 + random() * 0.36).toFixed(2))
      span.style.setProperty('animation-duration', `${duration.toFixed(2)}s`)
      line.append(span)
    } else {
      plain += glyph
    }
  }
  flush()
  field.append(line)
}

// Title, line and button rise once in view; the block itself goes from 0.3
// to 1 opacity and 0.97 to 1 scale as it climbs the viewport.
const closing = document.getElementById('closing')
const section = closing.closest('footer')
const still = matchMedia('(prefers-reduced-motion: reduce)')
new IntersectionObserver(
  ([entry], observer) => {
    if (!entry.isIntersecting) return
    closing.dataset.visible = ''
    observer.disconnect()
  },
  { rootMargin: '0px 0px -100px 0px' },
).observe(closing)
let frame = 0
const follow = () => {
  frame = 0
  if (still.matches) return
  const v = Math.min(1, Math.max(0, 1 - section.getBoundingClientRect().top / innerHeight))
  const opacity = v < 0.3 ? 0.3 + (v / 0.3) * 0.5 : 0.8 + Math.min(1, (v - 0.3) / 0.3) * 0.2
  closing.style.setProperty('opacity', opacity.toFixed(3))
  closing.style.setProperty('scale', (0.97 + Math.min(1, v / 0.45) * 0.03).toFixed(4))
}
addEventListener(
  'scroll',
  () => {
    if (!frame) frame = requestAnimationFrame(follow)
  },
  { passive: true },
)
follow()
