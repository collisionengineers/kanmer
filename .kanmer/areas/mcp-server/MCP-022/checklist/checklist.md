# Checklist — MCP-022

## Project identity

- [x] Add `project-identity.ts` using only Node path/crypto.
- [x] Canonicalize resolved roots, Windows drive casing, separators and trailing roots.
- [x] Build the exact ordered `{ boardRoot, format, repoRoot }` payload and prefix SHA-256 token.
- [x] Keep `boardSource` display-only and prove source independence with deterministic vectors.

## Errors and write schemas

- [x] Add the exact three-code `KanmerError` union and one coded error builder.
- [x] Preserve `Conflict:` and `Error:` text while coding only wrong-project, revision-conflict and real gate/collapsed-pipeline errors.
- [x] Add one optional top-level `expected_project` schema helper.
- [x] Cover all 18 write tools through central registration.
- [x] Keep `create_items.expected_project` outside entry fields.
- [x] Strip and compare the token before actor attribution, initialization, elicitation and handlers.
- [x] Keep omitted and exact token writes valid.
- [x] Cover migration and destructive schema surfaces.
- [x] Prove metadata is absent from persisted frontmatter.

## Status and evidence

- [x] Add `get_status.project` and `compat.expectedProject: "optional"` without removing existing fields.
- [x] Document sniff-before-send and machine-local semantics.
- [x] Independently recompute fingerprint vectors and source independence.
- [x] Prove a wrong fresh-root token leaves its full byte snapshot unchanged.
- [x] Cover wrong token on `create_items` and `migrate_board`.
- [x] Inventory all write schemas and preserve old-client writes.
- [x] Prove correct-token success, revision conflicts, direct gates, collapsed-pipeline gates, raw protocol content, and uncoded validation failures.
- [x] Update canonical tool-reference semantics; tool count unchanged.
- [x] Run workspace typecheck, build, stdio smoke (184/184), protocol smoke (42/42), discovery smoke (13/13), HTTP tests (3/3), and diff check.
- [x] Rebuild and commit the generated plugin bundle.
- [x] Run `plugin:check` in a normal checkout after merge; linked worktrees are intentionally refused. Evidence is in `proof.md` and the independent review.
- [x] Confirm no core/frontmatter, mandatory rollout, extra code, project UUID or dependency change.

## Review and closeout

- [x] Open PR #102 and obtain an independent post-hoc review; `scratch/independent-review.md` records PASS WITH FINDINGS and links the scoped remediation [[MCP-034]].
- [x] Historical “stop at Review” condition was not followed because PR #102 merged under standing delegation; the merge is recorded, no downstream [[MCP-023]] work was started, and the deviation is explicitly disclosed in the independent review.
- [x] Write the post-implementation report with commit/evidence.

## Closeout — 2026-08-21

- [x] Confirmed PR #102 merged at `f148769993472ede046cc6201645a5080481eebd`.
- [x] Final merged-main proof includes MCP-033’s canonical bundle repair and passing normal-main `plugin:check`.
- [x] Removed recorded `.worktrees/mcp-022` and deleted `mcp-022-project-fingerprint`.
- [x] Released ticket after cleanup; [[MCP-023]] remains the separately blocked downstream implementation ticket.
