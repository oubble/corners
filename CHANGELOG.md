# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres
to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-10-15

First public release.

### Added

- `capsulePath` and `capsuleRingPath`: iOS-calibrated capsule outlines as SVG
  path data, available DOM-free from `@oubble/corners/geometry`.
- `roundedPath` and `roundedRingPath`: continuous corners for any radius, with
  Figma's corner smoothing (`IOS_SMOOTHING`, 0.6, by default).
- A partial `border-radius` on a mounted element becomes a continuous corner of
  that radius; `--corners-smoothing` sets how smooth.
- `mount`, `unmount` and `observe` in `@oubble/corners/core`, with no side effects.
- `@oubble/corners` entry that mounts every `[data-corners]` element on import.
- Strokes through `data-corners-stroke` and `--corners-stroke`; fill overrides
  through `--corners-fill`.
- Shadow DOM support, Content Security Policy compatibility and diagnostics
  `OUB001` to `OUB004`.
- IIFE build for `<script>` use from a CDN.

[Unreleased]: https://github.com/oubble/corners/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/oubble/corners/releases/tag/v1.0.0
