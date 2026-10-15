import { capsulePath, mount, observe, unmount } from './dist/core.js'

// Mirror diagnostics on the page.
const panel = document.getElementById('diagnostics')
const warn = console.warn.bind(console)
console.warn = (...args) => {
  warn(...args)
  panel.textContent += `${args.find((arg) => typeof arg === 'string')}\n`
}
observe()

document.getElementById('shadows').addEventListener('change', (event) => {
  document.getElementById('gallery').classList.toggle('shadows', event.target.checked)
})

setTimeout(() => {
  const button = Object.assign(document.createElement('button'), {
    type: 'button',
    className: 'graphite',
    textContent: 'Born later',
  })
  button.dataset.capsule = ''
  document.getElementById('late').append(button)
}, 1500)

const target = document.getElementById('target')
const toggle = document.getElementById('toggle')
toggle.addEventListener('click', () => {
  const mounted = target.hasAttribute('data-capsule-state')
  if (mounted) {
    target.removeAttribute('data-capsule')
    unmount(target)
  } else {
    target.setAttribute('data-capsule', '')
    mount(target)
  }
  toggle.textContent = mounted ? 'mount' : 'unmount'
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

const deviation = document.getElementById('deviation')
for (const [label, w, h] of SPECIMENS) {
  const r = h / 2
  const [x0, x1, y0, y1] = [0.45 * r, 1.5 * r, -0.012 * r, 0.12 * r]
  const sx = WINDOW[0] / (x1 - x0)
  const sy = WINDOW[1] / (y1 - y0)
  const cell = Object.assign(document.createElement('div'), { className: 'specimen' })
  const button = Object.assign(document.createElement('button'), {
    type: 'button',
    className: 'cream',
    textContent: label,
  })
  button.dataset.capsule = ''
  button.style.setProperty('width', `${w}px`)
  button.style.setProperty('height', `${h}px`)
  button.style.setProperty('padding', '0')
  const svg = node(
    'svg',
    { viewBox: `0 0 ${WINDOW.join(' ')}`, role: 'img', 'aria-label': `${label} corner magnified` },
    cell,
  )
  const group = node('g', { transform: `scale(${sx} ${sy}) translate(${-x0} ${-y0})` }, svg)
  node('path', { class: 'inside', d: capsulePath(w, h) }, group)
  node('path', { class: 'gap', d: `${radiusPath(w, h)} ${capsulePath(w, h)}` }, group)
  node('path', { class: 'radius', d: radiusPath(w, h) }, group)
  node('path', { class: 'outline', d: capsulePath(w, h) }, group)
  const caption = Object.assign(document.createElement('span'), {
    className: 'label',
    textContent: `${w} × ${h} · ×${Math.round(sx)} along · ×${Math.round(sy)} deep · gap ≤ ${(0.02 * r).toFixed(2)} px`,
  })
  cell.prepend(button)
  cell.append(caption)
  deviation.append(cell)
}
