// Renders the README figures from the built package: `pnpm figures`.
//   docs/geometry.svg   annotated quadrant, plotted from capsulePath()
//   docs/hero.svg       border-radius ⇄ capsule morph with a magnified corner
//   docs/sizes.svg      real-size buttons, each corner magnified with the difference filled
//   docs/crest.svg      the Oubble mark's construction

import { writeFile } from 'node:fs/promises'
import { capsulePath } from '../dist/geometry.js'

const docs = new URL('../docs/', import.meta.url)

// ── Geometry ─────────────────────────────────────────────────────────────────

const S = 280 // px per R
const O = [56, 64] // origin of the quadrant in the drawing
const X = (x) => +(O[0] + x * S).toFixed(2)
const Y = (y) => +(O[1] + y * S).toFixed(2)

// Unit capsule (R = 1, long enough that the transition is at full size).
const coordinates = capsulePath(5, 2)
  .match(/-?\d+(?:\.\d+)?/g)
  .map(Number)
const [start, ...numbers] = Array.from({ length: coordinates.length / 2 }, (_, i) => [
  coordinates[2 * i],
  coordinates[2 * i + 1],
])
const [p1, p2, junction, k1, k2, end] = numbers
const E = start
const C = [1, 1]
const phi = Math.atan2(C[0] - junction[0], C[1] - junction[1])

const point = ([x, y]) => `${X(x)} ${Y(y)}`
const quadrant = `M ${point([2.15, 0])} L ${point(E)} C ${point(p1)} ${point(p2)} ${point(junction)} C ${point(k1)} ${point(k2)} ${point(end)}`
const radius = `M ${point([2.15, 0])} L ${point([1, 0])} A ${S} ${S} 0 0 0 ${point([0, 1])}`

const dot = ([x, y], cls = 'pt') => `<circle class="${cls}" cx="${X(x)}" cy="${Y(y)}" r="4.5"/>`
const handle = ([x, y]) => `<rect class="handle" x="${X(x) - 4}" y="${Y(y) - 4}" width="8" height="8"/>`
const label = ([x, y], text, dx = 0, dy = 0, anchor = 'start') =>
  `<text x="${X(x) + dx}" y="${Y(y) + dy}" text-anchor="${anchor}">${text}</text>`

const arc = (r) => {
  const a = [C[0], C[1] - r]
  const b = [C[0] - r * Math.sin(phi), C[1] - r * Math.cos(phi)]
  return `M ${point(a)} A ${r * S} ${r * S} 0 0 0 ${point(b)}`
}

const width = X(2.15) + 24
const height = Y(1) + 84

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" role="img">
<title>Capsule geometry: top-left quadrant against border-radius</title>
<style>
  :root { --ink: #1f2328; --muted: #8c959f; --grid: #eaeef2; --accent: #8f6f2e }
  @media (prefers-color-scheme: dark) { :root { --ink: #e6edf3; --muted: #7d8590; --grid: #21262d; --accent: #d3b885 } }
  text { fill: var(--muted) }
  .strong { fill: var(--ink) }
  .grid { stroke: var(--grid); stroke-width: 1 }
  .radius { fill: none; stroke: var(--muted); stroke-width: 1.5; stroke-dasharray: 5 5 }
  .curve { fill: none; stroke: var(--accent); stroke-width: 3; stroke-linecap: round }
  .leg { stroke: var(--muted); stroke-width: 1 }
  .pt { fill: var(--accent) }
  .center { fill: var(--muted) }
  .handle { fill: none; stroke: var(--accent); stroke-width: 1.5 }
  .dim { stroke: var(--muted); stroke-width: 1; fill: none }
</style>
${Array.from({ length: 22 }, (_, i) => `<line class="grid" x1="${X(i / 10)}" y1="${Y(0)}" x2="${X(i / 10)}" y2="${Y(1)}"/>`).join('')}
${Array.from({ length: 11 }, (_, i) => `<line class="grid" x1="${X(0)}" y1="${Y(i / 10)}" x2="${X(2.1)}" y2="${Y(i / 10)}"/>`).join('')}
<path class="radius" d="${radius}"/>
<line class="leg" x1="${X(E[0])}" y1="${Y(E[1])}" x2="${X(p1[0])}" y2="${Y(p1[1])}"/>
<line class="leg" x1="${X(junction[0])}" y1="${Y(junction[1])}" x2="${X(p2[0])}" y2="${Y(p2[1])}"/>
<line class="leg" x1="${X(C[0])}" y1="${Y(C[1])}" x2="${X(junction[0])}" y2="${Y(junction[1])}" stroke-dasharray="3 4"/>
<line class="leg" x1="${X(C[0])}" y1="${Y(C[1])}" x2="${X(C[0])}" y2="${Y(0)}" stroke-dasharray="3 4"/>
<path class="dim" d="${arc(0.22)}"/>
<path class="curve" d="${quadrant}"/>
${handle(p1)}${handle(p2)}${dot(E)}${dot(junction)}${dot(end)}${dot(C, 'center')}
${label(E, 'E', 0, -14, 'middle')}
${label(p1, 'P₁', 0, -14, 'middle')}
${label(p2, 'P₂', 0, -14, 'middle')}
${label(junction, 'J', -14, 4, 'end')}
${label(end, '(0, R)', 14, 4)}
${label(C, 'C', 12, 4)}
${label([C[0] - 0.06, C[1] - 0.3], 'φ = 34.24°', 0, 0, 'end')}
<path class="dim" d="M ${X(1)} ${Y(0) - 34} H ${X(E[0])} M ${X(1)} ${Y(0) - 38} v 8 M ${X(E[0])} ${Y(0) - 38} v 8"/>
${label([(1 + E[0]) / 2, 0], 'λ·R', 0, -42, 'middle')}
<path class="dim" d="M ${X(C[0]) + 34} ${Y(0)} V ${Y(1)}"/>
${label([C[0], 0.5], 'R', 42, 4)}
<text class="strong" x="${X(0)}" y="${Y(1) + 44}">━ capsule</text>
<text x="${X(0) + 110}" y="${Y(1) + 44}">- - border-radius: 50%</text>
<text x="${X(0) + 320}" y="${Y(1) + 44}">□ control points of the transition</text>
<text x="${X(0)}" y="${Y(1) + 70}">top-left quadrant of the unit capsule, plotted from capsulePath()</text>
</svg>
`

await writeFile(new URL('geometry.svg', docs), svg)

// ── Outlines ─────────────────────────────────────────────────────────────────

/**
 * A border-radius capsule written with the exact command sequence capsulePath
 * emits (straight-line cubic, then a cubic quarter circle per corner), so SMIL
 * can interpolate between the two outlines point by point.
 */
function radiusPath(width, height) {
  const r = height / 2
  const k = (4 / 3) * Math.tan(Math.PI / 8) * r
  const start = [r * 1.4154, 0]
  const quadrant = [
    [start[0] - (start[0] - r) / 3, 0],
    [r + (start[0] - r) / 3, 0],
    [r, 0],
    [r - k, 0],
    [0, r - k],
    [0, r],
  ]
  const f = ([x, y]) => `${+x.toFixed(3)} ${+y.toFixed(3)}`
  const mirrors = [
    (p) => p,
    ([x, y]) => [x, height - y],
    ([x, y]) => [width - x, height - y],
    ([x, y]) => [width - x, y],
  ]
  const inward = (m) => {
    const [a, b, c, d, e, g] = quadrant.map(m)
    return ` C ${f(a)} ${f(b)} ${f(c)} C ${f(d)} ${f(e)} ${f(g)}`
  }
  const outward = (m) => {
    const [a, b, c, d, e] = quadrant.map(m)
    return ` C ${f(e)} ${f(d)} ${f(c)} C ${f(b)} ${f(a)} ${f(m(start))}`
  }
  return `M ${f(start)}${inward(mirrors[0])}${outward(mirrors[1])} L ${f(mirrors[2](start))}${inward(mirrors[2])}${outward(mirrors[3])} Z`
}

const commands = (d) => d.replace(/[^A-Z]/g, '')
// ── Shared plate style ───────────────────────────────────────────────────────
// Cream on ink, hairlines, crosses at the frame corners: the Oubble identity.

const STYLE = `<style>
  :root { --fill: #24292f; --on-fill: #f6f3ec; --ink: #1f2328; --muted: #6e7781; --line: #d0d7de; --grid: #eaeef2; --accent: #8f6f2e }
  @media (prefers-color-scheme: dark) {
    :root { --fill: #ece6da; --on-fill: #15161a; --ink: #e6edf3; --muted: #7d8590; --line: #30363d; --grid: #161b22; --accent: #d3b885 }
  }
  text { fill: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px }
  .ink { fill: var(--ink) }
  .accent { fill: var(--accent) }
  .on-fill { fill: var(--on-fill); font-family: -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif; font-size: 15px; font-weight: 500 }
  .hair { fill: none; stroke: var(--line); stroke-width: 1 }
  .grid { stroke: var(--grid); stroke-width: 1 }
  .ghost { fill: none; stroke: var(--accent); stroke-width: 1.25; stroke-dasharray: 3 3; vector-effect: non-scaling-stroke }
  .edge { fill: none; stroke: var(--ink); stroke-width: 1.5; vector-effect: non-scaling-stroke }
</style>
`

/** A hairline frame with a small cross on each corner. */
function frame(x, y, w, h) {
  const cross = (cx, cy) =>
    `<path class="hair" d="M ${cx - 5} ${cy} H ${cx + 5} M ${cx} ${cy - 5} V ${cy + 5}"/>`
  return `<rect class="hair" x="${x}" y="${y}" width="${w}" height="${h}"/>${cross(x, y)}${cross(x + w, y)}${cross(x, y + h)}${cross(x + w, y + h)}`
}

/**
 * A deviation window on the top-left corner of a w×h capsule, magnified more in
 * depth than along the edge (as deviation plots are) so a sub-pixel gap reads:
 * capsule solid, border-radius dashed, the area between them filled.
 */
function magnifier(id, w, h, at, size, animate = '') {
  const r = h / 2
  const [x0, x1, y0, y1] = [0.45 * r, 1.5 * r, -0.012 * r, 0.12 * r]
  const sx = size[0] / (x1 - x0)
  const sy = size[1] / (y1 - y0)
  const radius = radiusPath(w, h)
  const outline = capsulePath(w, h)
  return `<g transform="translate(${at[0]} ${at[1]})">
  <clipPath id="${id}"><rect width="${size[0]}" height="${size[1]}"/></clipPath>
  <g clip-path="url(#${id})"><g transform="scale(${+sx.toFixed(4)} ${+sy.toFixed(4)}) translate(${+(-x0).toFixed(4)} ${+(-y0).toFixed(4)})">
    <path d="${outline}" fill="var(--fill)" opacity="0.12"/>
    <path d="${radius} ${outline}" fill="var(--accent)" fill-rule="evenodd" opacity="0.85"/>
    <path class="ghost" d="${radius}"/>
    <path class="edge" d="${animate ? radius : outline}">${animate}</path>
  </g></g>
  ${frame(0, 0, size[0], size[1])}
  <text x="0" y="${size[1] + 18}">×${Math.round(sx)} along · ×${Math.round(sy)} deep · gap ≤ ${(0.02 * r).toFixed(2)} px</text>
</g>`
}

// ── Hero ─────────────────────────────────────────────────────────────────────

{
  const W = 340
  const H = 96
  const from = radiusPath(W, H)
  const to = capsulePath(W, H)
  if (commands(from) !== commands(to)) throw new Error('hero: outlines are not interpolable')
  const timing =
    'dur="6s" repeatCount="indefinite" keyTimes="0;0.38;0.5;0.88;1" calcMode="spline" keySplines="0 0 1 1;0.65 0 0.35 1;0 0 1 1;0.65 0 0.35 1"'
  const morph = `<animate attributeName="d" values="${from};${from};${to};${to};${from}" ${timing}/>`
  const fade = (a, b) => `<animate attributeName="opacity" values="${a};${a};${b};${b};${a}" ${timing}/>`
  const width = 880
  const height = 250
  const grid =
    Array.from(
      { length: 23 },
      (_, i) => `<line class="grid" x1="${i * 40}" y1="0" x2="${i * 40}" y2="${height}"/>`,
    ).join('') +
    Array.from(
      { length: 7 },
      (_, i) => `<line class="grid" x1="0" y1="${i * 40}" x2="${width}" y2="${i * 40}"/>`,
    ).join('')
  const capsuleAt = [64, 64]
  const hero = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img">
<title>A capsule easing from border-radius: 50% into the capsule outline and back, with its corner magnified and the difference filled</title>
${STYLE}
${grid}
<g transform="translate(${capsuleAt.join(' ')})">
  <path d="${from}" fill="var(--fill)">${morph}</path>
  <path class="ghost" d="${from}"/>
  <text class="on-fill" x="${W / 2}" y="${H / 2 + 5}" text-anchor="middle">Continue</text>
  ${frame(-16, -16, W + 32, H + 32)}
  <text x="-16" y="${H + 42}">border-radius: 50%${fade(1, 0)}</text>
  <text class="accent" x="-16" y="${H + 42}" opacity="0">capsule${fade(0, 1)}</text>
  <text x="${W + 16}" y="${H + 42}" text-anchor="end">${W} × ${H}</text>
</g>
${magnifier('hero-zoom', W, H, [492, 48], [324, 128], morph)}
</svg>
`
  await writeFile(new URL('hero.svg', docs), hero)
}

// ── Sizes ────────────────────────────────────────────────────────────────────

{
  const SPECIMENS = [
    ['Ok', 84, 36],
    ['Continue', 140, 44],
    ['Add to bag', 196, 52],
  ]
  const column = 280
  const width = 880
  const height = 290
  const cells = SPECIMENS.map(([label, w, h], i) => {
    const x = 32 + i * column
    const cy = 40
    return `<g transform="translate(${x} ${cy})">
  <path d="${capsulePath(w, h)}" fill="var(--fill)"/>
  <text class="on-fill" x="${w / 2}" y="${h / 2 + 5}" text-anchor="middle">${label}</text>
  <text x="0" y="${h + 26}">${w} × ${h} · real size</text>
</g>
${magnifier(`size-${i}`, w, h, [x, 150], [232, 100])}`
  }).join('\n')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img">
<title>Three capsule buttons at real size, each with its top-left corner magnified: capsule solid, border-radius dashed, the difference filled</title>
${STYLE}
${cells}
</svg>
`
  await writeFile(new URL('sizes.svg', docs), svg)
}

// ── Crest ────────────────────────────────────────────────────────────────────
// The Oubble mark's construction, as drawn by the intro of oubble.com.

{
  const MARK = { ring: 113, petalRadius: 50, dotRadius: 50, petal: 74, hole: 40 }
  const PHI = (1 + Math.sqrt(5)) / 2
  const parts = []
  const circle = (x, y, r, dash = '', o = 1) =>
    parts.push(`<circle cx="${x}" cy="${y}" r="${+r.toFixed(2)}" stroke-dasharray="${dash}" opacity="${o}"/>`)
  const line = (x0, y0, x1, y1, dash = '', o = 1) =>
    parts.push(
      `<line x1="${+x0.toFixed(2)}" y1="${+y0.toFixed(2)}" x2="${+x1.toFixed(2)}" y2="${+y1.toFixed(2)}" stroke-dasharray="${dash}" opacity="${o}"/>`,
    )
  const centres = [0, 60, 120, 180, 240, 300].map((deg) => {
    const a = (deg * Math.PI) / 180
    return [Math.cos(a) * MARK.ring, Math.sin(a) * MARK.ring]
  })
  line(-300, 0, 300, 0, '', 0.45)
  line(0, -300, 0, 300, '', 0.45)
  for (let t = -280; t <= 280; t += 20) {
    line(t, -3, t, 3, '', 0.45)
    line(-3, t, 3, t, '', 0.45)
  }
  circle(0, 0, MARK.ring, '4 4')
  circle(0, 0, MARK.ring + MARK.petalRadius)
  circle(0, 0, (MARK.ring + MARK.petalRadius) * PHI, '2 6')
  centres.forEach(([x0, y0], i) => {
    const [x1, y1] = centres[(i + 1) % 6]
    line(x0, y0, x1, y1, '', 0.7)
    line(0, 0, x0 * 1.6, y0 * 1.6, '2 4', 0.7)
  })
  for (const [i, [x, y]] of centres.entries()) circle(x, y, i === 0 ? MARK.dotRadius : MARK.petalRadius)
  circle(0, 0, MARK.petal, '6 3')
  circle(0, 0, MARK.hole)
  const nodes = [[0, 0], ...centres].map(
    ([x, y]) => `<rect x="${+(x - 2).toFixed(2)}" y="${+(y - 2).toFixed(2)}" width="4" height="4"/>`,
  )
  const [ex, ey] = centres[0]
  const growth = Math.log(PHI) / (Math.PI / 2)
  const spiral = []
  for (let a = 0; a <= Math.PI * 4.6; a += 0.04) {
    const r = 3 * Math.exp(growth * a)
    spiral.push(
      `${+(ex + Math.cos(a + Math.PI) * r).toFixed(2)},${+(ey + Math.sin(a + Math.PI) * r).toFixed(2)}`,
    )
  }
  const label = (text, x, y, cls = '') =>
    `<text class="${cls}" x="${+x.toFixed(1)}" y="${+y.toFixed(1)}">${text}</text>`
  const crest = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-300 -300 600 600" role="img">
<title>The Oubble mark's construction: petals cut from circles on a hexagon, and a golden spiral whose eye is the dot outside the bubble</title>
<style>
  :root { --hair: #57606a; --label: #6e7781; --accent: #8f6f2e }
  @media (prefers-color-scheme: dark) { :root { --hair: #ece6da; --label: #9198a1; --accent: #d3b885 } }
  g { fill: none; stroke: var(--hair); stroke-width: 0.9 }
  .nodes { fill: var(--hair); stroke: none }
  text { fill: var(--label); stroke: none; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px }
  .accent { fill: var(--accent) }
</style>
<g>${parts.join('')}<polyline points="${spiral.join(' ')}" stroke="var(--accent)" opacity="0.9"/></g>
<g class="nodes">${nodes.join('')}</g>
${label(`R ${MARK.ring}`, MARK.ring * 0.45, -8)}
${label(`r ${MARK.petalRadius}`, centres[2][0] + MARK.petalRadius * 0.7, centres[2][1] - MARK.petalRadius * 0.7)}
${label(`Ø ${MARK.hole * 2}`, -MARK.hole * 0.9, MARK.hole + 14)}
${label('φ', (MARK.ring + MARK.petalRadius) * PHI * 0.72, -(MARK.ring + MARK.petalRadius) * PHI * 0.72)}
${label('outside the bubble', ex - 30, ey + MARK.dotRadius + 18, 'accent')}
</svg>
`
  await writeFile(new URL('crest.svg', docs), crest)
}
