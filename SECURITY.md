# Security policy

## Supported versions

Only the latest minor release receives fixes.

| Version | Supported |
| --- | --- |
| 1.x | yes |

## Reporting a vulnerability

Report privately through
[GitHub security advisories](https://github.com/oubble/corners/security/advisories/new).
Do not open a public issue.

You will get an acknowledgement within 72 hours and a fix or a decision within
14 days. Credit is given in the release notes unless you prefer otherwise.

## Scope

Corners runs in the page with the page's privileges. It writes only numeric path
data and computed CSS values to the DOM, performs no network requests and has no
runtime dependencies. Reports about the published artifact (for example a
release that does not match its provenance attestation) are in scope.
