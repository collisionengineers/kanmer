# Verification — secure remote access documentation

Verified on merged `main` at `6e52344c537768f5062746a1a3eed41683bd9908` after PR [#64](https://github.com/collisionengineers/kanmer/pull/64) merged on 2026-08-20.

## Evidence

- `npm run check:manual` passed: the generated manual is current across 19 chapters.
- `npm test -w @kanmer/gui -- manual.test.ts` passed: 11 tests.
- `npm run typecheck -w @kanmer/gui` passed.
- `git diff --check` passed on merged main.
- A scoped residual audit found no tracked source, docs, package, plugin, or script references to the removed private launcher/configuration (`infisical`, the prior tunnel id, `chatgpt-tunnel`, or `tunnel:doctor`).
- Independent re-review recorded no blockers: the final diff is limited to the README, the Connect manual chapter, and its generated chapter output; it contains no personal tunnel/workspace/secret configuration.

## Result

The merged documentation gives a portable, security-bounded Secure MCP Tunnel setup path without committing credentials, a private tunnel identifier, or a machine-specific launcher.
