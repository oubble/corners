# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres
to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-10-15

First public release.

### Added

- `capsulePath` and `capsuleRingPath`: iOS-calibrated capsule outlines as SVG
  path data, available DOM-free from `@oubble/capsule/geometry`.
- `mount`, `unmount` and `observe` in `@oubble/capsule/core`, with no side effects.
- `@oubble/capsule` entry that mounts every `[data-capsule]` element on import.
- Strokes through `data-capsule-stroke` and `--capsule-stroke`; fill overrides
  through `--capsule-fill`.
- Shadow DOM support, Content Security Policy compatibility and diagnostics
  `OUB001` to `OUB004`.
- IIFE build for `<script>` use from a CDN.

[Unreleased]: https://github.com/oubble/capsule/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/oubble/capsule/releases/tag/v1.0.0
