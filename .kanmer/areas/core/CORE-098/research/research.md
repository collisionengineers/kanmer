# Research — CORE-098: v0.3.5 successor release

## Question

How can Kanmer create and validate a successor release without rewriting the incomplete v0.3.4 publication, while preserving the protected-main, local-publisher, and read-only tag-verification boundaries?

## Findings

1. **The release is intentionally blocked by [[DOC-022]].** The dependency edge is `DOC-022 blocks CORE-098`; DOC-022 is currently Preparing and has no pull request. Its sole scoped change is the v0.3.5 entry in `apps/gui/release-notes.md`. The release script refuses preparation when the notes do not name the requested version, and a real preparation refuses a dirty checkout. Therefore no version bump, branch, release PR, tag, package, or publisher command is safe before DOC-022 has merged and current main includes its notes.  
   *Sources: CORE-098 links/body; DOC-022 item and links; `scripts/release.mjs` preflight.*

2. **v0.3.4 is historical failed evidence, not a recoverable target.** Read-only GitHub inspection found `refs/tags/v0.3.4` at `102ba3b120cc3065943089d122a6172de8934ece`, no GitHub Release for that tag, and release-verification run [32764694871](https://github.com/collisionengineers/kanmer/actions/runs/32764694871) failed. CORE-096 records this release as incomplete. The ticket constraint prohibits moving, recreating, uploading to, or repairing v0.3.4.  
   *Sources: GitHub CLI/tag lookup on 2026-08-24; CORE-096; CORE-098 constraints.*

3. **Preparation is a single, generated protected-main PR phase.** From a clean normal clone on the freshly merged `main` SHA, `npm run release -- 0.3.5 --ticket CORE-098` first runs the shared `VERIFY_STEPS` rail, then creates `release/v0.3.5`, updates only the release-bearing manifests/lockfile/generated MCP artifacts, commits, pushes that release branch, and opens a PR carrying the ticket footer. It creates neither a tag nor assets. It refuses an existing branch, a dirty tree, a non-main branch, stale notes, or a failed rail; no second preparation attempt or hand-edit is authorized after a failure.  
   *Sources: `scripts/release.mjs`, `scripts/release-flow.mjs`, `scripts/verify.mjs`; CORE-096 preparation report.*

4. **Publishing is a separate, post-merge local operation.** Only after independent review, required checks, and a normal protected-main merge may a new clean clone at the recorded merge SHA run `npm run release -- 0.3.5 --publish --release-commit <full-merge-sha>`. A publisher token is required only in that process environment; preparation uses the authenticated `gh` session for branch/PR operations but no publisher token. The script requires the exact merged manifest versions and commit ancestry before it creates/pushes only `v0.3.5`, then packages once and verifies the public assets.  
   *Sources: `scripts/release.mjs`; FRD-021 R3; AGENTS.md §11.*

5. **Tag verification must remain read-only and independently observed.** `.github/workflows/release.yml` has `permissions: contents: read`; on the pushed tag it validates versions, runs the authoritative verification rail, packages/checks the updater, and polls the public asset verifier. It must not gain a publisher credential or publish/repair capability. The local publisher's one built-in exact-file recovery, if exercised, is part of `release.mjs`; no out-of-band `gh release upload`, manual asset mutation, retag, or second package run is authorized.  
   *Sources: `.github/workflows/release.yml`; `scripts/release.mjs`; `scripts/release-publish.mjs`; CORE-097.*

6. **Downstream evidence is scoped, not a stage promotion.** CORE-098 blocks [[CORE-036]] and [[CORE-042]]. After publication, it may append exact v0.3.5 tag/workflow/asset facts to those tickets but may not mark either complete; each retains its own acceptance criteria.  
   *Sources: CORE-098 body/links; CORE-036 and CORE-042 items.*

## Implications

- The immediate deliverable is an executable hold plan, not release execution.
- The clean release workspace must be created only after the planning gate and must remain source-clean while DOC-022 is unresolved.
- All SHA, PR, workflow, and asset values are runtime evidence to be captured later; this research records no release success claim.

## Out of scope

- Any source or release-note edit (DOC-022 owns the only prerequisite documentation change).
- Changes to release scripts, workflows, package configuration, signing, tokens, GitHub permissions, Cloudflare, or updater behavior.
- Retagging, publishing, uploading, repairing, or deleting v0.3.4 artifacts.
- Reviewing/merging CORE-098's future PR or verifying/closing any ticket.
