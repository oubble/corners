import { describe, expect, test } from 'vitest'
import { IOS_SMOOTHING, roundedPath, roundedRingPath } from '../../src/geometry'

type Point = [number, number]

/** Absolute end points of every segment in the `M L c a Z` subset roundedPath emits. */
function endpoints(path: string): Point[][] {
  const tokens = path.match(/[MLcaZ]|-?\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? []
  const subpaths: Point[][] = []
  let points: Point[] = []
  let cursor: Point = [0, 0]
  let i = 0
  const n = (): number => Number(tokens[i++])
  while (i < tokens.length) {
    const command = tokens[i++]
    if (command === 'M') {
      points = []
      subpaths.push(points)
      cursor = [n(), n()]
    } else if (command === 'L') cursor = [n(), n()]
    else if (command === 'c') {
      i += 4
      cursor = [cursor[0] + n(), cursor[1] + n()]
    } else if (command === 'a') {
      i += 5
      cursor = [cursor[0] + n(), cursor[1] + n()]
    } else continue
    points.push(cursor)
  }
  return subpaths
}

const close = (a: number, b: number): boolean => Math.abs(a - b) < 0.005

describe('roundedPath', () => {
  test('starts where the top-left corner releases the edge: (1 + smoothing) × radius', () => {
    expect(roundedPath(200, 100, 20)).toMatch(/^M 32 0 L 168 0 /)
    expect(IOS_SMOOTHING).toBe(0.6)
  })

  test('with no smoothing it is exactly border-radius: quarter arcs and no transition', () => {
    const path = roundedPath(200, 100, 20, 0)
    expect(path.startsWith('M 20 0 L 180 0 c 0 0 0 0 0 0 a 20 20 0 0 1 20 20')).toBe(true)
  })

  test('closes on its starting point', () => {
    for (const [w, h, r, s] of [
      [200, 100, 20, 0.6],
      [44, 44, 12, 1],
      [320.5, 47.25, 9.5, 0.3],
    ] as const) {
      const [points] = endpoints(roundedPath(w, h, r, s))
      const first = points?.[0]
      const last = points?.at(-1)
      expect(first && last && close(first[0], last[0]) && close(first[1], last[1])).toBe(true)
    }
  })

  test('stays inside its box and touches every edge', () => {
    const [points = []] = endpoints(roundedPath(180, 60, 18))
    expect(points.every(([x, y]) => x >= -0.001 && x <= 180.001 && y >= -0.001 && y <= 60.001)).toBe(true)
    expect(Math.min(...points.map(([x]) => x))).toBeCloseTo(0, 2)
    expect(Math.max(...points.map(([x]) => x))).toBeCloseTo(180, 2)
    expect(Math.min(...points.map(([, y]) => y))).toBeCloseTo(0, 2)
    expect(Math.max(...points.map(([, y]) => y))).toBeCloseTo(60, 2)
  })

  test('clamps radii to half the short side and fits the smoothing in what is left', () => {
    expect(roundedPath(200, 100, 1000)).toBe(roundedPath(200, 100, 50))
    expect(roundedPath(200, 100, 40)).toMatch(/^M 50 0 /)
  })

  test('takes one radius per corner, clockwise from the top left', () => {
    const path = roundedPath(100, 100, [0, 10, 20, 30], 0)
    expect(path).toMatch(/^M 0 0 L 90 0 /)
    expect(path).toContain('a 10 10')
    expect(path).toContain('a 20 20')
    expect(path).toContain('a 30 30')
  })

  test('offsets every point by (x, y)', () => {
    const [plain = []] = endpoints(roundedPath(80, 40, 10))
    const [moved = []] = endpoints(roundedPath(80, 40, 10, IOS_SMOOTHING, 3, 4))
    expect(
      moved.every(([x, y], i) => close(x, (plain[i]?.[0] ?? 0) + 3) && close(y, (plain[i]?.[1] ?? 0) + 4)),
    ).toBe(true)
  })

  test('rejects empty boxes', () => {
    expect(() => roundedPath(0, 10, 4)).toThrow(RangeError)
  })
})

describe('roundedRingPath', () => {
  test('is the outline plus an inset outline with radii reduced by the thickness', () => {
    const ring = roundedRingPath(120, 48, 16, 2, 0)
    expect(endpoints(ring)).toHaveLength(2)
    expect(ring).toContain(`${roundedPath(120, 48, 16, 0)} M 16 2 `)
    expect(ring).toContain('a 14 14')
  })

  test('rejects a stroke that leaves no hole', () => {
    expect(() => roundedRingPath(40, 20, 8, 10)).toThrow(RangeError)
  })
})
