# Plan — CORE-027

## Objective

Ship a browser-only core subpath that exports the shared constants and pure group membership derivation without Node dependencies, then remove UI demo copies.

## Governing docs

No new governing document: this packaging correction is tracked by CORE-027's docs_todo marker.

## Steps

1. Extract deriveMembers into a pure module and make groups.ts import it.
2. Create browser.ts re-exporting only stages, profiles, and pure group derivation.
3. Configure tsup/package exports for ./browser with declarations.
4. Replace demo constants/helper with imports.
5. Add a build artifact guard and run core/UI checks.

## Acceptance

- Browser import resolves under the UI browser build.
- dist/browser.js contains no node: specifier.
- Root core entry remains unchanged.
