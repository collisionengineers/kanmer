# Plan — GUI-090

## Approach

Use the existing core detector as the only source of staleness facts. Add a cold-path, read-only GUI IPC method that evaluates it against the source checkout and the same bundled-skills root Connect uses. The renderer loads that report independently of watcher refresh, warns only when `upToDate === false`, and offers the complete rows in a disclosure so compensated/informational findings remain available without becoming a nag. In the same change, make the core provider-path roster the single source that GUI providers consume, preserving legacy registration inspection and the CORE-030 ownership correction.

## Governing docs

- [ADR-0015: Repo staleness is judged by content, not by version](docs/architecture/adr/ADR-0015-staleness-by-content-not-version.md) — use its itemised report, content-detection semantics, and `behind`-only warning rule.
- [FRD-013: Setup as reconciliation](docs/functional/frd/FRD-013-setup-as-reconciliation.md) — keep the report detection-only; show existing actionable fix text rather than repairing from the read path.
- [[CORE-023]] — completed detector/report foundation.
- [[CORE-030]] — currently implements the immediate owned-skills correction; incorporate its finalized roster and do not reintroduce `.claude/skills`.

## Steps

1. Define/export a core-owned staleness path catalog covering the copied-skill destinations and registration files the detector checks, with an explicit legacy registration entry where needed. Refactor `staleness.ts` to consume it and update `providers.ts` to read its provider-relevant paths rather than maintain a second list; retain GUI-only provider commands and parsing.
2. Reuse/expose Connect’s bundled plugin skills-root resolution and add a narrow `getRepoStaleness(projectId)` IPC handler. It must call core against `ProjectContext.sourceRoot` and the board/store context, not the board worktree, and must stay outside `snapshotOf()` and `refresh()`.
3. Extend the shared IPC contract and preload bridge with the core `RepoStaleness` result type and the new read-only method.
4. Add a focused renderer banner/disclosure near the existing format banner. Fetch it independently when a project is opened/selected; render core `detail` and `fix` values without translation; surface an attention banner only for `behind` rows, while allowing all returned rows to be inspected.
5. Add focused tests for the path-catalog/provider mapping, IPC/core parity with a source-vs-board-root setup, and presentation eligibility: behind warns, compensated-only does not, and mixed reports retain itemised details. Include a regression assertion that marketplace-only Claude paths remain absent once CORE-030 is integrated.
6. Run focused core and GUI tests/typechecks plus `git diff --check`; exercise the report against a representative repo and compare its rows with `get_status.repo`.

## Verification

- The same repository/build produces equal `RepoStaleness` rows through GUI IPC and MCP `get_status.repo`.
- A compensated-only report leaves `upToDate` true and produces no persistent banner.
- The report handler is not called by `snapshotOf()` or watcher-driven `refresh()`.
- The renderer displays each returned row’s artefact, state, detail, and existing fix text.
- Core’s source roster contains only actual owned copied-skill destinations after [[CORE-030]]; provider configuration derives from that source without altering registration behavior.
- Focused core/GUI tests and workspace typechecks pass; `git diff --check` is clean.

## Risks / questions

- CORE-030 is still in Implementing. Rebase/integrate after its final change so this ticket consumes its ownership correction instead of creating a conflicting roster edit.
- The legacy `.mcp.json` entry is still detector coverage even though no current provider writes it; preserve that distinction in the core catalog.
- No user decision is needed: existing `fix` strings are the designated human guidance, and a generic automatic repair would violate ADR-0015/FRD-013.
