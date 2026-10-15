import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/core.ts', 'src/geometry.ts'],
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    dts: true,
    sourcemap: true,
    clean: true,
  },
  {
    entry: { corners: 'src/index.ts' },
    format: 'iife',
    globalName: 'OubbleCorners',
    platform: 'browser',
    target: 'es2022',
    minify: true,
    sourcemap: true,
    clean: false,
  },
])
