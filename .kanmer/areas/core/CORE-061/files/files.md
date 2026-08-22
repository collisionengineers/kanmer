# Files map — CORE-061

## Change surface

| File | Expected change | Risk / proof |
|---|---|---|
| `scripts/agents-block-body.mjs` | Add the `KANMER_BOARD_BRANCH` repository-variable and handoff convention to the canonical managed instructions. | This is the single generated source; prove exact bytes through the managed-block verifier. |
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | Keep the fenced canonical block in sync with the body source. | Setup would otherwise overwrite the new convention; verify check 7. |
| `AGENTS.md` | Regenerate the marker-delimited block while preserving the contributor guide outside it. | This is the file agents read; verify idempotence and marker integrity. |
| `scripts/verify-agents-block.mjs` / tests | Run existing end-to-end checks; add a focused assertion only if the convention is not covered by byte parity. | Avoid a speculative gate; existing verifier should prove the claim. |

## Context files

| File | Why it matters |
|---|---|
| `.github/workflows/pr.yml` | Defines the exact variable name and fallback consumed by `kanmer-gate`. |
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` | Defines the board branch contract and administrator boundary. |
| `docs/architecture/adr/ADR-0016-compiled-workflow.md` | Forbids silently turning Kanmer into a GitHub protection API. |
| `scripts/agents-block.mjs` | Owns insertion/refresh semantics and must remain the only writer. |
| `scripts/verify-agents-block.mjs` | Provides exact managed-block, skill-fence, idempotence, and pointer checks. |

## Ripple effects and out of scope

The generated manual and workflow are context, not additional sources to duplicate. No GitHub variable mutation, branch-protection API, or unrelated contributor-guide rewrite belongs here.
