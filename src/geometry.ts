/**
 * Continuous-corner capsule geometry. Pure functions, no DOM: safe on the
 * server, in workers and in build tools.
 *
 * The outline is fitted to a native iOS capsule. Each quadrant is two cubic
 * Béziers: a transition that leaves the straight edge early, and a circular
 * cap of the full radius. Top-left quadrant in the canonical frame (y down,
 * long axis horizontal):
 *
 *   0            J       P₂       R    P₁     E = R·(1 + λ)
 *   ┊            ┊       ┊        ┊    ┊      ┊
 *                        ○    ─────────○──────●━━━━━━━━━━━━━━━━━━━━━   top edge, κ = 0
 *                     ────────
 *                 ────
 *              ╱─●                                                     J: transition meets the cap
 *            ╱╱                                                           at φ = 34.24° from the top of
 *          ╱╱                                                             the circle, shared tangent (G¹)
 *         ╱
 *        ╱
 *      ╱╱                                                              cap: circle of radius R
 *      ╱                                                                    centred on C
 *     ╱
 *    ╱
 *    ╱
 *   │
 *   │
 *   ●                             + C = (R, R)                         (0, R): end of the capsule
 *
 * Measured on the unit capsule (R = 1):
 *   - curvature where the transition leaves the edge   κ·R = 0.012
 *   - curvature at J, transition → cap                 κ·R = 1.81 → 1.00
 *   - radial error of the cubic cap                    1.5 × 10⁻⁵ · R
 *   - deepest inset against a border-radius capsule    0.020 · R
 */

type Point = readonly [x: number, y: number]

/** λ: how far past the tangent point the edge starts to bend, in R. */
const RUNOUT = 0.4154
/** φ: where the transition meets the circle, from the circle's top (34.24°). */
const JUNCTION = 0.5976
/** h₀: length of the edge-side control handle, in R. */
const HANDLE_EDGE = 0.2591
/** h₁: length of the cap-side control handle, in R. */
const HANDLE_CAP = 0.3102

const QUARTER_TURN = Math.PI / 2

/**
 * Outline of a `width` × `height` capsule as SVG path data, offset by
 * (`x`, `y`). Usable in `clip-path: path()`, `<path d>`, `Path2D` and canvas.
 *
 * @throws {RangeError} when a dimension is not a positive finite number.
 */
export function capsulePath(width: number, height: number, x = 0, y = 0): string {
  assertExtent('width', width)
  assertExtent('height', height)

  const transposed = height > width
  const long = transposed ? height : width
  const short = transposed ? width : height
  const r = short / 2

  // Below a 1 + λ aspect ratio the transitions of opposite corners would
  // overlap. They shrink together, down to a plain circle on a square box.
  const s = Math.min(1, (long / 2 - r) / (RUNOUT * r))

  const edge = r + RUNOUT * r * s
  const phi = JUNCTION * s
  const sin = Math.sin(phi)
  const cos = Math.cos(phi)
  const jx = r - r * sin
  const jy = r - r * cos
  const k = (4 / 3) * Math.tan((QUARTER_TURN - phi) / 4) * r
  const h0 = HANDLE_EDGE * r * s
  const h1 = HANDLE_CAP * r * s

  // Top-left quadrant from E along the edge to the cap's leftmost point:
  // transition (P₁, P₂, J), then the cap (two handles, end point).
  const p1: Point = [edge - h0, 0]
  const p2: Point = [jx + h1 * cos, jy - h1 * sin]
  const junction: Point = [jx, jy]
  const k1: Point = [jx - k * cos, jy + k * sin]
  const k2: Point = [0, r - k]
  const apex: Point = [0, r]
  const start: Point = [edge, 0]

  const point = ([px, py]: Point): string => {
    const [u, v] = transposed ? [py, px] : [px, py]
    return `${round(u + x)} ${round(v + y)}`
  }
  const topLeft = (p: Point): Point => p
  const bottomLeft = ([px, py]: Point): Point => [px, short - py]
  const bottomRight = ([px, py]: Point): Point => [long - px, short - py]
  const topRight = ([px, py]: Point): Point => [long - px, py]

  const inward = (m: (p: Point) => Point): string =>
    ` C ${point(m(p1))} ${point(m(p2))} ${point(m(junction))}` +
    ` C ${point(m(k1))} ${point(m(k2))} ${point(m(apex))}`
  const outward = (m: (p: Point) => Point): string =>
    ` C ${point(m(k2))} ${point(m(k1))} ${point(m(junction))}` +
    ` C ${point(m(p2))} ${point(m(p1))} ${point(m(start))}`

  return (
    `M ${point(start)}${inward(topLeft)}${outward(bottomLeft)}` +
    ` L ${point(bottomRight(start))}${inward(bottomRight)}${outward(topRight)} Z`
  )
}

/**
 * A capsule outline of stroke `thickness`: the outer capsule plus the inner
 * one inset by `thickness`. Paint it with the `evenodd` fill rule so the
 * inner capsule becomes a real, transparent hole.
 *
 * @throws {RangeError} when the stroke leaves no room for the hole.
 */
export function capsuleRingPath(width: number, height: number, thickness: number): string {
  assertExtent('thickness', thickness)
  if (2 * thickness >= Math.min(width, height)) {
    throw new RangeError(`capsule: thickness ${thickness} leaves no hole inside a ${width}×${height} capsule`)
  }
  return `${capsulePath(width, height)} ${capsulePath(width - 2 * thickness, height - 2 * thickness, thickness, thickness)}`
}

/** Radii for the four corners, clockwise from the top left. */
export type Radii = readonly [topLeft: number, topRight: number, bottomRight: number, bottomLeft: number]

/** Figma's iOS preset, and what Apple's own continuous corners measure. */
export const IOS_SMOOTHING = 0.6

/**
 * A rectangle with continuous (smoothed) corners of `radius`, as SVG path data
 * offset by (`x`, `y`). Each corner is Figma's corner smoothing: a circular
 * arc shortened by `smoothing` (0 is `border-radius`, 1 is fully smoothed),
 * entered and left through cubic transitions that ramp the curvature from
 * zero, so the edge flows into the corner without a visible joint.
 *
 * Radii above half the shorter side are clamped there, and the smoothing
 * shrinks to fit what is left, the way Figma resolves it. For a fully rounded
 * box use {@link capsulePath}, which is calibrated against iOS instead.
 *
 * @throws {RangeError} when a dimension is not a positive finite number.
 */
export function roundedPath(
  width: number,
  height: number,
  radius: number | Radii,
  smoothing: number = IOS_SMOOTHING,
  x = 0,
  y = 0,
): string {
  assertExtent('width', width)
  assertExtent('height', height)
  const budget = Math.min(width, height) / 2
  const radii: Radii = typeof radius === 'number' ? [radius, radius, radius, radius] : radius
  const clamped = (r: number): Corner => corner(Math.min(Math.max(0, r), budget), smoothing, budget)
  const tl = clamped(radii[0])
  const tr = clamped(radii[1])
  const br = clamped(radii[2])
  const bl = clamped(radii[3])
  const n = (value: number): number => round(value)
  const at = (px: number, py: number): string => `${n(px + x)} ${n(py + y)}`

  // Every corner is the same three pieces, turned a quarter each time:
  // transition cubic, arc, transition cubic. (dx, dy) is the travel direction.
  const turn = (c: Corner, dx: number, dy: number): string => {
    const { a, b, c: cc, d, arc, r } = c
    // Along the incoming edge (dx, dy), then bending toward (-dy, dx).
    const ux = -dy
    const uy = dx
    const v = (along: number, across: number): string =>
      `${n(dx * along + ux * across)} ${n(dy * along + uy * across)}`
    return (
      ` c ${v(a, 0)} ${v(a + b, 0)} ${v(a + b + cc, d)}` +
      ` a ${n(r)} ${n(r)} 0 0 1 ${v(arc, arc)}` +
      ` c ${v(d, cc)} ${v(d, b + cc)} ${v(d, a + b + cc)}`
    )
  }

  return (
    `M ${at(tl.p, 0)} L ${at(width - tr.p, 0)}${turn(tr, 1, 0)}` +
    ` L ${at(width, height - br.p)}${turn(br, 0, 1)}` +
    ` L ${at(bl.p, height)}${turn(bl, -1, 0)}` +
    ` L ${at(0, tl.p)}${turn(tl, 0, -1)} Z`
  )
}

/**
 * {@link roundedPath} as a stroke of `thickness`: the outer outline plus the
 * inner one, inset by `thickness` with radii reduced to match. Paint it with
 * the `evenodd` fill rule.
 *
 * @throws {RangeError} when the stroke leaves no room for the hole.
 */
export function roundedRingPath(
  width: number,
  height: number,
  radius: number | Radii,
  thickness: number,
  smoothing: number = IOS_SMOOTHING,
): string {
  assertExtent('thickness', thickness)
  if (2 * thickness >= Math.min(width, height)) {
    throw new RangeError(`capsule: thickness ${thickness} leaves no hole inside a ${width}×${height} box`)
  }
  const [tl, tr, br, bl]: Radii = typeof radius === 'number' ? [radius, radius, radius, radius] : radius
  const inset = (r: number): number => Math.max(0, r - thickness)
  const inner: Radii = [inset(tl), inset(tr), inset(br), inset(bl)]
  return `${roundedPath(width, height, radius, smoothing)} ${roundedPath(width - 2 * thickness, height - 2 * thickness, inner, smoothing, thickness, thickness)}`
}

interface Corner {
  /** Distance from the corner where the edge starts to bend. */
  readonly p: number
  readonly a: number
  readonly b: number
  readonly c: number
  readonly d: number
  /** Chord of the arc, on each axis. */
  readonly arc: number
  readonly r: number
}

/** Figma's corner smoothing for one corner ("Desperately seeking squircles"). */
function corner(r: number, smoothing: number, budget: number): Corner {
  const wanted = Math.min(Math.max(0, smoothing), 1)
  const s = r > 0 ? Math.min(wanted, Math.max(0, budget / r - 1)) : 0
  const p = Math.min((1 + s) * r, budget)
  const degrees = Math.PI / 180
  const arcMeasure = 90 * (1 - s)
  const arc = Math.sin((arcMeasure / 2) * degrees) * r * Math.SQRT2
  const alpha = (90 - arcMeasure) / 2
  const p3p4 = r * Math.tan((alpha / 2) * degrees)
  const beta = 45 * s
  const c = p3p4 * Math.cos(beta * degrees)
  const d = c * Math.tan(beta * degrees)
  const b = (p - arc - c - d) / 3
  return { p, a: 2 * b, b, c, d, arc, r }
}

/** Three decimals is 1/1000 px: below any rasterizer's precision. */
function round(value: number): number {
  return +value.toFixed(3)
}

function assertExtent(name: string, value: number): void {
  if (!(Number.isFinite(value) && value > 0)) {
    throw new RangeError(`capsule: ${name} must be a positive finite number, received ${value}`)
  }
}
