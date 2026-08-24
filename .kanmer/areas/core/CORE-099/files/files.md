# Files — CORE-099

## Where the change lands

CORE-099 performs no source edit during planning. A later authorized release preparation is expected to create only the script-generated version/artifact diff on a new `release/v0.3.6` branch; the exact set must be recorded from that invocation rather than pre-authored or hand-edited.

| Path | Why |
|---|---|
| `apps/gui/release-notes.md` | Owned by [[DOC-023]]; its merged v0.3.6 wording is a hard prerequisite and must not be edited by CORE-099. |
| `package.json`, `apps/gui/package.json`, plugin manifests, `mcpb/manifest.json`, `package-lock.json`, `plugins/kanmer/mcp/kanmer-mcp.cjs` | The existing preparation script may generate this release-version/artifact set; CORE-099 must accept only the script-generated diff and must not amend it manually. |
| `scripts/release.mjs` | Existing release owner and command surface only; no CORE-099 source modification is authorized. |
| `scripts/verify-release-assets.mjs` | Existing post-publish asset verifier only; no source modification is authorized. |
| `.github/workflows/release.yml` | Existing tag-triggered, read-only release verification workflow; observe its terminal result only. |
| CORE-099 ticket documents | Plan, checklist, execution report, and later proof carry sanitized evidence through Kanmer MCP only. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `docs/functional/frd/FRD-021-auto-update.md` | R3 requires protected-main preparation, version-naming release notes, and a self-update-capable package; it defines the release-discipline outcome. |
| `AGENTS.md` | Human-owned release guidance states the protected-main/local-publisher sequence and the pre-tag GUI-build failure boundary. |
| `scripts/release.mjs` | Exact refusal/preflight checks, shared verification rail, branch/tag refs, one-package publisher, and public asset verification contract. |
| `scripts/release-flow.mjs` | Defines release branch/tag names and full-SHA requirements used by the invocation contract. |
| `scripts/verify-release-assets.mjs` | Defines the expected public asset and integrity-verification evidence. |
| `.github/workflows/release.yml` | Defines the read-only tag-triggered `release-verify` observation that must be awaited, not used to publish. |
| [[DOC-023]] | Owns v0.3.6 notes and blocks any preparation until normal merge, merged-main proof, and Done. |
| [[GUI-131]] proof | Establishes the already-merged pre-tag GUI-build source behavior; it is context, not a source-change invitation. |
| [[CORE-096]] and [[CORE-098]] records | Preserve the failed v0.3.4/v0.3.5 evidence and prior clean-clone/KANMER_ROOT lessons; neither record may be repaired by this ticket. |
| [[CORE-036]] and [[CORE-042]] | Downstream evidence consumers with independent acceptance criteria and stage ownership. |

## Ripple effects

- A successful preparation PR changes release-bearing manifests and committed distributable artifacts only through the existing script.
- A successful publisher invocation can create the new immutable `v0.3.6` tag, public GitHub Release, expected assets, a tag-triggered verification run, and updater-facing release metadata.
- The exact release facts may be appended to CORE-036 and CORE-042, but CORE-099 must not change either ticket's stage, checklist, proof, or acceptance decision.
- Credential exposure is process-local: never source, ticket documents, CI configuration, logs, or reports.

## Out of scope

- Any source, workflow, credential, package-configuration, or Electron Builder change.
- Changes to v0.3.4 or v0.3.5 tags, releases, assets, branches, proofs, or historical failure records.
- Manual asset upload, GitHub Release repair/edit, retagging, a second package, retries after a failed phase, or administrative/protected-main merge bypass.
- A release preparation/publisher invocation, source worktree/branch, PR, tag, release, or proof during this planning assignment.
