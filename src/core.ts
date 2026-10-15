/**
 * DOM runtime: paints capsules onto existing elements without wrapping them.
 *
 *   host element                    the author's <button>, untouched in the tree
 *   ├─ background                   read once, then made transparent
 *   ├─ ::before                     carries the background, clipped to the capsule
 *   └─ children                     render above ::before (isolated stacking context)
 *
 * Mounting writes only inline longhands it can restore exactly, and one
 * private attribute. A single ResizeObserver refits every host from its
 * fractional border box, so the clip tracks layout without polling.
 */

import { capsulePath, capsuleRingPath } from './geometry'

export { capsulePath, capsuleRingPath } from './geometry'

/** Removes the capsule and restores the element to its previous state. */
export type Unmount = () => void

export interface ObserveOptions {
  /** Which elements receive a capsule. Defaults to `[data-capsule]`. */
  readonly selector?: string
}

type Root = Document | ShadowRoot
type Saved = readonly (readonly [property: string, value: string, priority: string])[]

interface Mount {
  readonly hadStyleAttribute: boolean
  readonly saved: Saved
  readonly stroke: number
  readonly vertical: boolean
  width: number
  height: number
}

const SELECTOR = '[data-capsule]'
const STROKE = 'data-capsule-stroke'
const STATE = 'data-capsule-state'
const PAINT = '--_capsule-paint'
const CLIP = '--_capsule-clip'
const ELEMENT_NODE = 1
const DOCUMENT_NODE = 9

const RULES = `[${STATE}]::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:0;background:var(${PAINT});clip-path:var(${CLIP})}`

const supports = (value: string): boolean => typeof CSS !== 'undefined' && CSS.supports('clip-path', value)
const SUPPORTS_PATH = supports('path("M0 0H1V1Z")')
const SUPPORTS_EVENODD = supports('path(evenodd,"M0 0H1V1Z")')

const mounts = new WeakMap<HTMLElement, Mount>()
const styledRoots = new WeakSet<Root>()
const sheets = new WeakMap<Document, CSSStyleSheet>()
let resizer: ResizeObserver | undefined

const noop: Unmount = () => {}

/**
 * Paints a capsule on `host` and keeps it fitted as the element resizes.
 * Calling it again on a mounted element re-reads its background and stroke.
 *
 * Without `clip-path: path()` support, or on a disconnected element, this is
 * a no-op and the element keeps its own CSS.
 */
export function mount(host: HTMLElement): Unmount {
  if (!SUPPORTS_PATH || !host.isConnected) return noop

  const existing = mounts.get(host)
  if (existing) {
    restore(host, existing.saved)
  } else {
    diagnosePseudoElement(host)
    installStyles(host.getRootNode() as Root, host.ownerDocument)
  }

  const style = getComputedStyle(host)
  diagnose(host, style)

  const requested = Math.max(0, Number.parseFloat(host.getAttribute(STROKE) ?? '') || 0)
  if (requested > 0 && !SUPPORTS_EVENODD) report(host, 'OUB004')
  const paint =
    requested > 0 ? 'var(--capsule-stroke, currentColor)' : `var(--capsule-fill, ${style.background})`

  const state: Mount = {
    hadStyleAttribute: existing?.hadStyleAttribute ?? host.hasAttribute('style'),
    saved: override(host, style),
    stroke: SUPPORTS_EVENODD ? requested : 0,
    vertical: style.writingMode.startsWith('vertical'),
    width: existing?.width ?? 0,
    height: existing?.height ?? 0,
  }
  mounts.set(host, state)
  host.style.setProperty(PAINT, paint)
  host.setAttribute(STATE, 'mounted')

  if (existing) {
    refit(host, state)
  } else {
    resizer ??= new ResizeObserver(onResize)
    resizer.observe(host, { box: 'border-box' })
  }

  return () => unmount(host)
}

/** Removes the capsule from `host`. Inline styles return to what they were. */
export function unmount(host: HTMLElement): void {
  const state = mounts.get(host)
  if (!state) return
  mounts.delete(host)
  resizer?.unobserve(host)
  restore(host, state.saved)
  host.style.removeProperty(PAINT)
  host.style.removeProperty(CLIP)
  host.removeAttribute(STATE)
  if (!state.hadStyleAttribute && host.style.length === 0) {
    // Blink and WebKit serialize inline styles lazily; reading the attribute
    // flushes the pending write so the removal sticks.
    host.getAttribute('style')
    host.removeAttribute('style')
  }
}

/**
 * Mounts every element under `root` that matches the selector, now and as
 * the tree changes: insertions mount, removals unmount, and edits to `class`
 * or the `data-capsule*` attributes re-read the element.
 *
 * @returns a function that stops observing and unmounts everything it mounted.
 */
export function observe(
  root: Document | ShadowRoot | Element = document,
  { selector = SELECTOR }: ObserveOptions = {},
): () => void {
  // Hosts this observer mounted. Elements mounted by hand are never released here.
  const owned = new WeakSet<HTMLElement>()
  const claim = (host: HTMLElement): void => {
    mount(host)
    owned.add(host)
  }
  const release = (host: HTMLElement): void => {
    if (!owned.delete(host)) return
    unmount(host)
  }

  const visit = (node: Node, apply: (host: HTMLElement) => void): void => {
    if (node.nodeType !== ELEMENT_NODE && node.nodeType !== DOCUMENT_NODE && !isShadowRoot(node)) return
    if (node.nodeType === ELEMENT_NODE && (node as Element).matches(selector)) apply(node as HTMLElement)
    for (const host of (node as ParentNode).querySelectorAll<HTMLElement>(selector)) apply(host)
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') {
        const host = record.target as HTMLElement
        if (host.matches(selector)) claim(host)
        else release(host)
        continue
      }
      for (const node of record.removedNodes) {
        visit(node, (host) => {
          if (!host.isConnected) release(host)
        })
      }
      for (const node of record.addedNodes) visit(node, claim)
    }
  })

  visit(root, claim)
  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'data-capsule', STROKE],
  })

  return () => {
    observer.disconnect()
    visit(root, release)
  }
}

function onResize(entries: ResizeObserverEntry[]): void {
  for (const entry of entries) {
    const host = entry.target as HTMLElement
    const state = mounts.get(host)
    if (!state) continue
    // borderBoxSize is fractional and ignores transforms; offset* is the
    // integer fallback for engines that predate it.
    const box = entry.borderBoxSize?.[0]
    state.width = box ? (state.vertical ? box.blockSize : box.inlineSize) : host.offsetWidth
    state.height = box ? (state.vertical ? box.inlineSize : box.blockSize) : host.offsetHeight
    refit(host, state)
  }
}

function refit(host: HTMLElement, { width, height, stroke }: Mount): void {
  if (!(width > 0 && height > 0)) return
  const clip =
    stroke > 0 && 2 * stroke < Math.min(width, height)
      ? `path(evenodd, "${capsuleRingPath(width, height, stroke)}")`
      : `path("${capsulePath(width, height)}")`
  host.style.setProperty(CLIP, clip)
}

/**
 * Applies the host-side declarations as inline `!important` longhands, so no
 * author rule can reintroduce the rectangle, and returns what was there.
 */
function override(host: HTMLElement, style: CSSStyleDeclaration): Saved {
  const declarations: [string, string][] = [
    ['background-color', 'transparent'],
    ['background-image', 'none'],
    ['border-top-left-radius', '0'],
    ['border-top-right-radius', '0'],
    ['border-bottom-right-radius', '0'],
    ['border-bottom-left-radius', '0'],
    ['isolation', 'isolate'],
  ]
  if (style.position === 'static') declarations.push(['position', 'relative'])
  if (style.display === 'inline') declarations.push(['display', 'inline-block'])

  return declarations.map(([property, value]) => {
    const previous = [
      property,
      host.style.getPropertyValue(property),
      host.style.getPropertyPriority(property),
    ] as const
    host.style.setProperty(property, value, 'important')
    return previous
  })
}

function restore(host: HTMLElement, saved: Saved): void {
  for (const [property, value, priority] of saved) {
    if (value) host.style.setProperty(property, value, priority)
    else host.style.removeProperty(property)
  }
}

/**
 * One rule per root. Constructable stylesheets go through the CSSOM, which a
 * strict Content Security Policy allows; a <style> element is the fallback.
 */
function installStyles(root: Root, document: Document): void {
  if (styledRoots.has(root)) return
  styledRoots.add(root)
  const view = document.defaultView

  if (view && 'adoptedStyleSheets' in root && 'replaceSync' in view.CSSStyleSheet.prototype) {
    let sheet = sheets.get(document)
    if (!sheet) {
      sheet = new view.CSSStyleSheet()
      sheet.replaceSync(RULES)
      sheets.set(document, sheet)
    }
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, sheet]
    return
  }

  const element = document.createElement('style')
  element.textContent = RULES
  ;(root.nodeType === DOCUMENT_NODE ? document.head : root).append(element)
}

function isShadowRoot(node: Node): node is ShadowRoot {
  return node.nodeType === 11 && 'host' in node
}

// ── Diagnostics ─────────────────────────────────────────────────────────────

type Code = keyof typeof DIAGNOSTICS

const DIAGNOSTICS = {
  OUB001: 'box-shadow follows the element rectangle, not the capsule. Use filter: drop-shadow().',
  OUB002: 'border follows the element rectangle, not the capsule. Use data-capsule-stroke.',
  OUB003: '::before is already styled on this element. Capsule paints with it.',
  OUB004: 'clip-path: path(evenodd, …) is unsupported here, so the stroke renders as a solid capsule.',
} as const

const reported = new WeakMap<Element, Set<Code>>()

function diagnose(host: HTMLElement, style: CSSStyleDeclaration): void {
  if (style.boxShadow !== 'none') report(host, 'OUB001')
  if (style.borderTopStyle !== 'none' && Number.parseFloat(style.borderTopWidth) > 0) {
    report(host, 'OUB002')
  }
}

function diagnosePseudoElement(host: HTMLElement): void {
  const content = getComputedStyle(host, '::before').content
  if (content !== 'none' && content !== 'normal') report(host, 'OUB003')
}

function report(host: Element, code: Code): void {
  const codes = reported.get(host) ?? new Set<Code>()
  if (codes.has(code)) return
  reported.set(host, codes.add(code))
  console.warn(
    `[capsule] ${code}: ${DIAGNOSTICS[code]}\nhttps://github.com/oubble/capsule#${code.toLowerCase()}`,
    host,
  )
}
