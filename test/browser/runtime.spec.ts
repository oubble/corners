import { expect, type Page, test } from '@playwright/test'

declare global {
  interface Window {
    capsule: typeof import('../../src/index')
    geometry: typeof import('../../src/geometry')
  }
}

const RED = 'rgb(228, 28, 85)'
const TRANSPARENT = 'rgba(0, 0, 0, 0)'

async function open(page: Page, query = ''): Promise<void> {
  await page.goto(`/test/fixtures/${query}`)
  await page.waitForSelector('html[data-ready]')
}

const clipOf = (page: Page, selector: string): Promise<string> =>
  page.$eval(selector, (el) => (el as HTMLElement).style.getPropertyValue('--_capsule-clip'))

const expectedClip = (page: Page, width: number, height: number): Promise<string> =>
  page.evaluate(([w, h]) => `path("${window.geometry.capsulePath(w, h)}")`, [width, height] as const)

const pseudo = (page: Page, selector: string, property: string): Promise<string> =>
  page.$eval(selector, (el, p) => getComputedStyle(el, '::before').getPropertyValue(p), property)

const own = (page: Page, selector: string, property: string): Promise<string> =>
  page.$eval(selector, (el, p) => getComputedStyle(el).getPropertyValue(p), property)

/** Inserts markup into <body> and returns once the observer has fitted it. */
async function insert(page: Page, html: string, selector: string): Promise<void> {
  await page.evaluate((markup) => document.body.insertAdjacentHTML('beforeend', markup), html)
  await expect.poll(() => clipOf(page, selector)).not.toBe('')
}

test.describe('auto entry', () => {
  test('mounts [data-capsule] on import, clipped to the fractional border box', async ({ page }) => {
    await open(page)
    await expect.poll(() => clipOf(page, '#pill')).toBe(await expectedClip(page, 216, 75))
    expect(await page.getAttribute('#pill', 'data-capsule-state')).toBe('mounted')
    expect(await pseudo(page, '#pill', 'clip-path')).toMatch(/^path\(/)
  })

  test('moves the background from the host onto ::before', async ({ page }) => {
    await open(page)
    await expect.poll(() => own(page, '#pill', 'background-color')).toBe(TRANSPARENT)
    expect(await pseudo(page, '#pill', 'background-color')).toBe(RED)
  })

  test('the CDN build mounts from a plain <script> and exposes a global', async ({ page }) => {
    await page.goto('/test/fixtures/iife.html')
    await expect.poll(() => pseudo(page, '#pill', 'clip-path')).toMatch(/^path\(/)
    expect(
      await page.evaluate(() => typeof (window as unknown as { OubbleCapsule: unknown }).OubbleCapsule),
    ).toBe('object')
  })

  test('works under a strict Content Security Policy', async ({ page }) => {
    await open(page, '?csp')
    await expect.poll(() => pseudo(page, '#pill', 'clip-path')).toMatch(/^path\(/)
    expect(await pseudo(page, '#pill', 'background-color')).toBe(RED)
  })
})

test.describe('lifecycle', () => {
  test('refits when the element resizes', async ({ page }) => {
    await open(page)
    await page.$eval('#pill', (el) => (el as HTMLElement).style.setProperty('width', '300.5px'))
    await expect.poll(() => clipOf(page, '#pill')).toBe(await expectedClip(page, 300.5, 75))
  })

  test('unmount restores the element byte for byte', async ({ page }) => {
    await open(page)
    const markup = '<a id="link" class="pill" style="color: red; background-color: blue !important;">Go</a>'
    await page.evaluate((html) => document.body.insertAdjacentHTML('beforeend', html), markup)
    await page.evaluate(() => window.capsule.mount(document.getElementById('link')!))
    await expect.poll(() => clipOf(page, '#link')).not.toBe('')
    await page.evaluate(() => window.capsule.unmount(document.getElementById('link')!))
    expect(await page.$eval('#link', (el) => el.outerHTML)).toBe(markup)
  })

  test('removes a style attribute it had to create', async ({ page }) => {
    await open(page)
    await page.evaluate(() => window.capsule.unmount(document.getElementById('pill')!))
    expect(await page.$eval('#pill', (el) => el.getAttribute('style'))).toBe(null)
  })

  test('remounting after unmount keeps the rectangle hidden', async ({ page }) => {
    await open(page)
    await page.evaluate(() => {
      const pill = document.getElementById('pill')!
      window.capsule.unmount(pill)
      window.capsule.mount(pill)
    })
    await expect.poll(() => clipOf(page, '#pill')).not.toBe('')
    expect(await own(page, '#pill', 'background-color')).toBe(TRANSPARENT)
    expect(await pseudo(page, '#pill', 'background-color')).toBe(RED)
  })

  test('mounts inserted elements and releases removed ones', async ({ page }) => {
    await open(page)
    await insert(page, '<button id="late" class="pill" data-capsule>Late</button>', '#late')
    const released = await page.evaluate(async () => {
      const late = document.getElementById('late')!
      late.remove()
      await new Promise(requestAnimationFrame)
      return late.hasAttribute('data-capsule-state')
    })
    expect(released).toBe(false)
  })

  test('removing data-capsule unmounts, adding it back mounts', async ({ page }) => {
    await open(page)
    await page.$eval('#pill', (el) => el.removeAttribute('data-capsule'))
    await expect.poll(() => page.getAttribute('#pill', 'data-capsule-state')).toBe(null)
    await page.$eval('#pill', (el) => el.setAttribute('data-capsule', ''))
    await expect.poll(() => page.getAttribute('#pill', 'data-capsule-state')).toBe('mounted')
  })

  test('leaves elements mounted by hand to their owner', async ({ page }) => {
    await open(page)
    await page.evaluate(() => {
      document.body.insertAdjacentHTML('beforeend', '<button id="manual" class="pill">Manual</button>')
      window.capsule.mount(document.getElementById('manual')!)
    })
    await page.$eval('#manual', (el) => el.classList.add('blue'))
    await page.evaluate(() => new Promise(requestAnimationFrame))
    expect(await page.getAttribute('#manual', 'data-capsule-state')).toBe('mounted')
  })
})

test.describe('paint', () => {
  test('data-capsule-stroke paints an evenodd ring that follows the attribute', async ({ page }) => {
    await open(page)
    await insert(
      page,
      '<button id="ring" class="pill" data-capsule data-capsule-stroke="2">Ghost</button>',
      '#ring',
    )
    const ring = await page.evaluate(() => `path(evenodd, "${window.geometry.capsuleRingPath(216, 75, 2)}")`)
    expect(await clipOf(page, '#ring')).toBe(ring)
    await page.$eval('#ring', (el) => el.setAttribute('data-capsule-stroke', '4'))
    const thicker = await page.evaluate(
      () => `path(evenodd, "${window.geometry.capsuleRingPath(216, 75, 4)}")`,
    )
    await expect.poll(() => clipOf(page, '#ring')).toBe(thicker)
  })

  test('--capsule-fill overrides the captured background', async ({ page }) => {
    await open(page)
    await page.$eval('#pill', (el) => el.style.setProperty('--capsule-fill', 'rgb(0, 0, 0)'))
    expect(await pseudo(page, '#pill', 'background-color')).toBe('rgb(0, 0, 0)')
  })

  test('a class change re-reads the background', async ({ page }) => {
    await open(page)
    await page.$eval('#pill', (el) => el.classList.add('blue'))
    await expect.poll(() => pseudo(page, '#pill', 'background-color')).toBe('rgb(10, 132, 255)')
  })

  test('mounts inside a shadow root', async ({ page }) => {
    await open(page)
    const background = await page.evaluate(async () => {
      const host = document.createElement('div')
      document.body.append(host)
      const root = host.attachShadow({ mode: 'open' })
      root.innerHTML =
        '<style>button{width:120px;height:44px;border:0;background:rgb(10,132,255)}</style><button data-capsule>In shadow</button>'
      window.capsule.observe(root)
      const button = root.querySelector('button')!
      while (!button.style.getPropertyValue('--_capsule-clip')) await new Promise(requestAnimationFrame)
      return getComputedStyle(button, '::before').backgroundColor
    })
    expect(background).toBe('rgb(10, 132, 255)')
  })
})

test.describe('diagnostics', () => {
  test('reports box-shadow once, with its code', async ({ page }) => {
    const warnings: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'warning') warnings.push(message.text())
    })
    await open(page)
    await insert(page, '<button id="shadow" class="pill shadowed" data-capsule>Shadow</button>', '#shadow')
    await page.$eval('#shadow', (el) => el.classList.add('blue'))
    await page.evaluate(() => new Promise(requestAnimationFrame))
    expect(warnings.filter((text) => text.includes('OUB001'))).toHaveLength(1)
  })
})
