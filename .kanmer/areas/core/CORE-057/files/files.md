# Files — CORE-057 DNS/request binding remediation

- packages/mcp-server/src/sources.ts: existing fetchText/assertPublicDestination/request lookup seam; bind request connection to validated DNS addresses or implement the documented safe equivalent, and share one deadline across resolver, redirects, and body reads.
- packages/mcp-server/src/sources.test.mjs: deterministic lookup/fetch regressions for validated-address binding, resolver timeout, and surfaced errors; retain all existing source-boundary cases.
- packages/mcp-server/package.json / scripts/verify.mjs: only if the focused source rail needs registration or command correction; do not duplicate the authoritative test path.
- package dependencies: add none unless the existing runtime already exposes the required transport seam; report a blocker rather than introducing an unapproved dependency.

## Deliberately out of scope

- No new source kinds, GUI editor, provider registration, authentication, crawler, cache redesign, or unrelated CORE-044/045/051/053 finding.
