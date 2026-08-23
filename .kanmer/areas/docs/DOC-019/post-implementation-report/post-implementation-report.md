# Post-implementation report — DOC-019

*The report is the author's claim before merge; proof must be gathered on merged `main`.*

## Summary

Refreshed the canonical `kanmer-docs` document-model asset and its board-specific repository mirror to describe the live format-3 folders, six stages, profile-resolved gates, and configured governing-document globs. Updated README and AGENTS operator guidance for Windows source/installed paths, the protected-main release flow, and retained release artifacts; reconciled stale as-built GUI prose in FRD-019; and added a dependency-free mirror freshness check to the documentation and shared verification rails.

## Changes

| File | Change | Why |
|---|---|---|
| `plugins/kanmer/skills/kanmer-docs/assets/doc-structure.md` | Replaced the stale format-2/seven-stage asset with the current format-3 document model, target-neutral `repoDocs` placeholders, fixed document-type statement, and freshness instructions | This is the canonical `kanmer-docs` source used to materialize a target repository's mirror without baking in another board's paths. |
| `docs/contributing/doc-structure.md` | Regenerated for this board with its resolved governing-document globs | Keeps the committed mirror aligned with this board while allowing the shipped asset to work for boards with other `repoDocs` maps. |
| `README.md` | Corrected Windows source/installed behavior, documented prepare-PR then post-merge publish commands, and documented retaining/providing local release artifacts with `--dir` | Matches the current Electron paths and `scripts/release.mjs` protected-main contract; explains the byte-comparison verifier's local-artifact prerequisite without embedding credentials or bypasses. |
| `AGENTS.md` | Added `verify:docs` to the command table and verification checklist, updated the shared-verify description, and documented the release verifier's optional artifact directory | Keeps contributor and agent instructions in sync with the authoritative PR/release rail. |
| `docs/functional/frd/FRD-019-gui-shell.md` | Updated stale verified-against-code lines for six stages, current Settings tabs, and renderer ContextMenu implementation; narrowed the submenu keyboard claim | FRD prose now matches the shipped GUI and its deterministic tests. The existing ArrowLeft focus limitation is recorded and tracked as GUI-126; no GUI source behavior was changed in this documentation ticket. |
| `scripts/check-doc-structure.mjs` | Added pure target-neutral asset, resolved-mirror, required-marker, and retired-marker validation | Makes drift deterministic without falsely requiring a project-specific mirror to be byte-identical to a reusable skill asset. |
| `scripts/check-doc-structure.test.mjs` | Added current target-neutral/resolved-mirror and deliberately stale format-2 fixture tests | Proves both PASS and failure behavior. |
| `scripts/verify-docs.mjs` | Runs the document-structure check as part of documentation verification | Existing docs verification now covers both the in-app manual and the repository mirror. |
| `scripts/verify.mjs` | Adds `npm run verify:docs` to the shared verification sequence | A normal PR/release verification cannot silently skip documentation freshness. |

## Governing docs

- **FRD-014 R4:** the canonical `kanmer-docs` asset and generated mirror are kept together; the new check enforces their shared model, target-neutral source placeholders, effective board-resolved mirror globs when the board worktree is available, and rejection of retired model markers.
- **FRD-019 R5/R6:** the stale verified-against-code paragraph now records the six fixed stages, current Settings surface, renderer-drawn ContextMenu, viewport/submenu behavior, and the evidence actually covered by tests. It no longer presents full submenu keyboard navigation as verified; GUI-126 tracks the source fix. No product behavior was changed.
- **FRD-021 R3:** README release instructions now name the protected-main preparation PR and the post-merge publication command, including full-SHA reachability, complete asset verification, and retention/provision of local artifacts; a matching local manifest enables its byte comparison while the verifier's documented fallback checks presence/state only.

## Risks / follow-ups

- The canonical asset intentionally leaves repository-specific `repoDocs` globs unresolved; `kanmer-setup` must materialize the target board's resolved values into its mirror. Future document-model changes must update the asset first and regenerate the mirror in the same change.
- The current implementation closes the entire ContextMenu on `ArrowLeft` from a submenu. GUI-126 is the explicit follow-up for parent-focus restoration and keyboard assertions; implementing GUI behavior remains outside DOC-019's documentation-only scope.
- `npm test` was attempted after `npm ci` and `npm run build:core`; it retains a pre-existing Windows filesystem cleanup failure in `packages/core/src/docs.test.ts` (`creation is ungated (FRD-002 G3)` timed out and then reported `ENOTEMPTY` under `%TEMP%`). This documentation change did not alter core code. The focused documentation rail and complete `test:scripts` suite passed.

## Verification hand-off

On merged `main`, run:

- `npm run verify:skills` — expect the skill-prose rail to pass with zero legacy `impact` hits.
- `npm run verify:docs` — expect the manual check, target-neutral canonical asset check, and board-resolved mirror check to pass.
- `node --test scripts/check-doc-structure.test.mjs` — expect 3/3 pass, including stale-fixture rejection and injected custom-board globs.
- `npm run test:scripts` — expect the full dependency-free scripts suite to pass.
- `npm run build:core` and `git diff --check` — expect both to pass.

No GUI screenshot is required; FRD-019 changes are source-backed prose only.

## Review remediation — independent PR findings

- **F-001 / legacy term:** reworded the canonical skill asset and generated mirror so the forbidden retired term is absent from the skills tree. Fresh `verify:skills` passed.
- **3837493575 / target-specific globs:** made the shipped canonical asset target-neutral and kept the generated mirror's current board globs. The freshness check now validates both shapes instead of byte equality.
- **3837493577 / configurable document types:** removed the claim that boards can configure a different document-type set; the asset now states that Format 3's seven folder types are fixed and profiles only select requirements.
- **3837493579 / AGENTS command documentation:** added `npm run verify:docs` to the command table and checklist and described its role in `npm run verify`.
- **3837493581 / FRD-019 keyboard claim:** narrowed the verified statement to the behavior and tests actually present, recorded the ArrowLeft limitation, and opened GUI-126 for the out-of-scope source fix.
- **3837493582 / release artifact retention:** documented retaining or explicitly supplying local installer/blockmap artifacts with `--dir`; the matching-manifest byte comparison and presence-only fallback are now explicit.

## Review remediation — second pass

- **3837522502 / effective repoDocs:** the freshness check now discovers an available board worktree (or honors `KANMER_BOARD_ROOT`/`KANMER_ROOT`) and compares the mirror against that effective map. With no board checkout, it validates the target-neutral/source-independent shape; tests inject a custom map to prove stale values fail. No repository-specific glob literals remain in the checker.
- **3837522504 / local latest.yml fallback:** aligned README and AGENTS with `verify-release-assets.mjs`: installer/blockmap artifacts are required to derive the expected set; a matching local `latest.yml` gets a byte comparison, while absent/different-version local manifests are presence/state-only.
- **3837522507 / consumer footer:** separated source-repository maintenance guidance from the materialized mirror. The canonical asset retains Kanmer-source instructions; the mirror tells consumer maintainers to rerun their setup/documentation rail and contains no Kanmer source path or root verification command.
- **3837522508 / dry-run writes:** clarified README and AGENTS that dry-run skips Git and remote publication but verification may create or replace local build outputs, and aligned `scripts/release.mjs`'s final message with that contract.

The ticket remains in Review for fresh independent review; no merge was performed.
