# Files — CORE-101

## Where the change lands

CORE-101 has no source change during planning. If later authorized, the existing release script creates the complete generated version/artifact diff on a new `release/v0.3.7` branch; its exact diff is recorded from the one preparation invocation and is never pre-authored or hand-edited.

| Path / record | Why |
|---|---|
| `apps/gui/release-notes.md` | Exclusively owned by [[DOC-024]] until that ticket is Done; its merged 0.3.7 wording is the hard prerequisite for preparation. |
| `scripts/release.mjs` | Existing two-phase release orchestrator; CORE-101 invokes it later but must not edit it. |
| `scripts/verify-release-assets.mjs` | Existing strict public asset/latest.yml verifier; it must be run read-only for v0.3.7, not changed or weakened. |
| `apps/gui/electron-builder.yml` | Existing explicit safe Windows artifact name from [[CORE-100]]; execution validates it through the package and public output, with no config change. |
| `.github/workflows/release.yml` | Existing tag-triggered, non-publishing `release-verify` workflow whose terminal success is required evidence. |
| Generated release diff: version manifests, lockfile, MCPB/plugin artifacts | May be created only by the single preparation script on its generated release branch and accepted only as produced. |
| CORE-101 ticket documents | Hold plan, sanitized phase output, PR/merge/tag/workflow evidence, and later proof are written through Kanmer MCP. |
| [[CORE-036]] and [[CORE-042]] scratch | Receive factual scoped downstream evidence only; CORE-101 does not change their stage, proof, checklist, or acceptance decision. |

## Context files

| Path / record | What it tells the implementer |
|---|---|
| `docs/functional/frd/FRD-021-auto-update.md` | The protected-main, version-notes, package/updater, and observable release requirements that define success. |
| `AGENTS.md` | The protected-main/local-publisher sequence, pre-tag GUI-build failure boundary, strict public asset contract, and secret restrictions. |
| `scripts/release.mjs` | Exact CLI contract: `--ticket` preparation is distinct from `--publish --release-commit <40-char SHA>`; it refuses invalid branch/cleanliness/version/reachability state. |
| `scripts/verify-release-assets.mjs` | Required public installer, blockmap, MCPB, state, size, SHA-256, and `latest.yml` bridge checks; exit 0 PASS, 1 incomplete, 2 INCONCLUSIVE. |
| `.github/workflows/release.yml` | Read-only tag workflow performs authoritative verification/package rails and bounded strict asset polling, but never publishes or repairs. |
| `apps/gui/electron-builder.yml` | The explicit future `Kanmer-Setup-<version>.exe` naming contract that v0.3.7 must carry end-to-end. |
| [[DOC-024]] | The exact typed prerequisite and sole owner of 0.3.7 release-note changes. |
| [[CORE-099]] / [[CORE-100]] reports and proof | v0.3.6 failure evidence must remain immutable; the future artifact contract is already merged and proven. |
| [[HZN-007]] `context.md` | One-boundary workflow, independent review/merge, no direct board edits, and evidence/traceability rules. |

## Ripple effects

- A successful preparation invocation creates one normal release PR whose generated commit must pass independent review and protected-main merge.
- A successful publisher invocation may create only the new immutable `v0.3.7` tag, a public GitHub Release, the updater asset set, and a tag-triggered verification run.
- Public evidence must prove the exact tag target, non-draft release, uploaded/digested assets, `latest.yml` contract, and terminal `release-verify` success.
- The later proof/closeout must preserve exact command exits and expose no credential; it may append scoped facts to CORE-036/CORE-042 without deciding those tickets.

## Out of scope

- Any source, workflow, CI-permission, credential, release-config, verifier, or Electron Builder modification.
- Taking CORE-101, creating a worktree/branch/PR, running release preparation/publisher, tagging, publishing, asset upload, release repair/edit, or proof during this planning assignment.
- Any mutation of v0.3.4, v0.3.5, or v0.3.6 tags, releases, assets, workflows, historical evidence, or state.
- Manual repair, outer retry/re-run, forced tag/branch change, or administrative protected-main merge bypass.
- Advancing or closing DOC-024, CORE-036, CORE-042, CORE-099, or CORE-100.
