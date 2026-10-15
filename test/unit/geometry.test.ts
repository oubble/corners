import { describe, expect, test } from 'vitest'
import { capsulePath, capsuleRingPath } from '../../src/geometry'

type Point = [number, number]
type Cubic = [Point, Point, Point, Point]

/** Parses the `M … C … L … Z` subset that capsulePath emits into cubics. */
function cubics(path: string): Cubic[] {
  const tokens = path.match(/[MCLZ]|-?\d+(?:\.\d+)?/g) ?? []
  const curves: Cubic[] = []
  let cursor: Point = [0, 0]
  let i = 0
  const next = (): Point => [Number(tokens[i++]), Number(tokens[i++])]
  while (i < tokens.length) {
    const command = tokens[i++]
    if (command === 'M' || command === 'L') cursor = next()
    else if (command === 'C') {
      const curve: Cubic = [cursor, next(), next(), next()]
      curves.push(curve)
      cursor = curve[3]
    }
  }
  return curves
}

function at([p0, p1, p2, p3]: Cubic, t: number): Point {
  const u = 1 - t
  const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t] as const
  return [
    b[0] * p0[0] + b[1] * p1[0] + b[2] * p2[0] + b[3] * p3[0],
    b[0] * p0[1] + b[1] * p1[1] + b[2] * p2[1] + b[3] * p3[1],
  ]
}

function sample(path: string, steps = 200): Point[] {
  return cubics(path).flatMap((curve) => Array.from({ length: steps + 1 }, (_, i) => at(curve, i / steps)))
}

/** Signed curvature at t = 0, from the first two control legs. */
function startCurvature([p0, p1, p2]: Cubic): number {
  const d = [p1[0] - p0[0], p1[1] - p0[1]]
  const e = [p2[0] - p1[0], p2[1] - p1[1]]
  return ((2 / 3) * (d[0]! * e[1]! - d[1]! * e[0]!)) / Math.hypot(d[0]!, d[1]!) ** 3
}

const unit = (a: Point, b: Point): Point => {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1])
  return [(b[0] - a[0]) / length, (b[1] - a[1]) / length]
}

const SIZES: [number, number][] = [
  [216, 75],
  [44, 44],
  [60, 44],
  [120, 44],
  [44, 170],
  [400.5, 57.25],
  [1, 1],
]

describe('capsulePath', () => {
  test('matches the calibrated reference outline', () => {
    expect(capsulePath(216, 75)).toMatchInlineSnapshot(
      `"M 53.078 0 C 43.361 0 26.017 -0.046 16.4 6.499 C 6.14 13.482 0 25.089 0 37.5 C 0 49.911 6.14 61.518 16.4 68.501 C 26.017 75.046 43.361 75 53.078 75 L 162.923 75 C 172.639 75 189.983 75.046 199.6 68.501 C 209.86 61.518 216 49.911 216 37.5 C 216 25.089 209.86 13.482 199.6 6.499 C 189.983 -0.046 172.639 0 162.923 0 Z"`,
    )
  })

  test.each(SIZES)('%d×%d is four corner pairs and two straight runs', (w, h) => {
    expect(capsulePath(w, h)).toMatch(/^M [^MCLZ]+( C [^MCLZ]+){4} L [^MCLZ]+( C [^MCLZ]+){4} Z$/)
  })

  test.each(SIZES)('%d×%d stays inside its box', (w, h) => {
    const tolerance = 1e-6 * Math.min(w, h) + 5e-4 // curve excursion + output rounding
    for (const [x, y] of sample(capsulePath(w, h))) {
      expect(x).toBeGreaterThanOrEqual(-tolerance)
      expect(y).toBeGreaterThanOrEqual(-tolerance)
      expect(x).toBeLessThanOrEqual(w + tolerance)
      expect(y).toBeLessThanOrEqual(h + tolerance)
    }
  })

  test.each(SIZES)('%d×%d is symmetric about both axes', (w, h) => {
    const points = cubics(capsulePath(w, h)).flat()
    const present = ([x, y]: Point): boolean =>
      points.some(([px, py]) => Math.abs(px - x) <= 2e-3 && Math.abs(py - y) <= 2e-3)
    for (const [x, y] of points) {
      expect(present([w - x, y])).toBe(true)
      expect(present([x, h - y])).toBe(true)
    }
  })

  test('keeps the full radius: the caps reach the midline at both ends', () => {
    const points = cubics(capsulePath(216, 75)).flat()
    expect(points).toContainEqual([0, 37.5])
    expect(points).toContainEqual([216, 37.5])
  })

  test('a tall box is the transpose of the wide one', () => {
    const wide = cubics(capsulePath(170, 44)).flat()
    const tall = cubics(capsulePath(44, 170)).flat()
    expect(tall).toEqual(wide.map(([x, y]) => [y, x]))
  })

  test('a square box degenerates to a circle', () => {
    const r = 50
    for (const [x, y] of sample(capsulePath(2 * r, 2 * r))) {
      expect(Math.abs(Math.hypot(x - r, y - r) - r) / r).toBeLessThan(3e-4)
    }
  })

  test('the transition leaves the straight edge with near-zero curvature', () => {
    const r = 1000 // large radius so output rounding does not dominate
    const [transition] = cubics(capsulePath(4 * r, 2 * r))
    expect(Math.abs(startCurvature(transition!) * r)).toBeLessThan(0.02)
  })

  test('the transition meets the cap with a shared tangent (G¹)', () => {
    const curves = cubics(capsulePath(4000, 2000))
    const [transition, cap] = [curves[0]!, curves[1]!]
    const incoming = unit(transition[2], transition[3])
    const outgoing = unit(cap[0], cap[1])
    expect(incoming[0]).toBeCloseTo(outgoing[0], 4)
    expect(incoming[1]).toBeCloseTo(outgoing[1], 4)
  })

  test('the offset translates every point', () => {
    const base = cubics(capsulePath(120, 44)).flat()
    const moved = cubics(capsulePath(120, 44, 7.5, -3)).flat()
    moved.forEach(([x, y], i) => {
      expect(x).toBeCloseTo(base[i]![0] + 7.5, 3)
      expect(y).toBeCloseTo(base[i]![1] - 3, 3)
    })
  })

  test.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects a dimension of %d', (bad) => {
    expect(() => capsulePath(bad, 44)).toThrow(RangeError)
    expect(() => capsulePath(120, bad)).toThrow(RangeError)
  })
})

describe('capsuleRingPath', () => {
  test('is the outer capsule followed by the inset inner capsule', () => {
    expect(capsuleRingPath(120, 44, 3)).toBe(`${capsulePath(120, 44)} ${capsulePath(114, 38, 3, 3)}`)
  })

  test.each([0, -2, 22, 30])('rejects a thickness of %d on a 120×44 capsule', (bad) => {
    expect(() => capsuleRingPath(120, 44, bad)).toThrow(RangeError)
  })
})
