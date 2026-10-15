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

/** Three decimals is 1/1000 px: below any rasterizer's precision. */
function round(value: number): number {
  return +value.toFixed(3)
}

function assertExtent(name: string, value: number): void {
  if (!(Number.isFinite(value) && value > 0)) {
    throw new RangeError(`capsule: ${name} must be a positive finite number, received ${value}`)
  }
}
