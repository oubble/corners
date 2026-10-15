/**
 * Zero-config entry: importing it mounts every `[data-capsule]` element in the
 * document, including ones added later. For explicit control without side
 * effects, import from `@oubble/capsule/core`.
 */

import { observe } from './core'

export * from './core'

// One document-wide observer even when two copies of the package are loaded
// (a bundled copy and a CDN copy, or two versions in a monorepo).
const AUTOLOAD = Symbol.for('oubble.capsule.autoload')

if (typeof document !== 'undefined' && !(AUTOLOAD in globalThis)) {
  Object.defineProperty(globalThis, AUTOLOAD, { value: true })
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => observe(), { once: true })
  } else {
    observe()
  }
}
