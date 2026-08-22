# Research — CORE-035: compiled-workflow spine integration verification

## Question

Can the compiled-workflow spine be proven end-to-end on a disposable private GitHub copy of the exact merged Kanmer source, while retaining every packet refusal, merge-gate result, protected-merge refusal, exact-SHA verification result, and cleanup event without changing production code or board state?

## Findings

- **The ticket is ready for execution after research.** CORE-035 is in Preparing with profile `chore`; its existing `files.md`, `plan.md`, `checklist.md`, and resolved `open-questions.md` define a verification-only run. The plan requires no permanent product-source change.
- **The required predecessor contracts are present and passed.** CORE-033 is Done with merged-main proof at `44264b2fa18031d83d7f538db7725c0f27e2feca`; MCP-023 is Done with packet proof at `75cc4a89`; SKILL-021 is Done with exact-SHA proof at `28d525cc808ef4e8e36ee831be276da1323434d5`; CORE-025 is Done on merged main at `c8ea0b778895b0a76d9e32152a1f58c7b3b3d77b`, with hosted gate/verify PASS and detached focused rails recorded in its proof.
- **The exact source under test is origin/main `c8ea0b778895b0a76d9e32152a1f58c7b3b3d77b`.** The current production checkout is intentionally dirty and behind origin; it must not be used as the fixture. A clean detached/exported copy at this full SHA is required for the production rail and disposable repository.
- **The shipped workflow has two real Windows jobs.** `.github/workflows/pr.yml` runs `verify` on `windows-latest` with Node 20 and `npm ci && npm run verify`; `kanmer-gate` builds core, fetches the separate `kanmer-board` worktree, and invokes `packages/mcp-server/src/check-pr.mjs`. The workflow triggers only for PRs targeting `main`.
- **The verification rail is one shared production caller.** `scripts/verify.mjs` exports the ordered `VERIFY_STEPS` consumed by PR/release verification, including build, tests, all-workspace typecheck, MCP smokes/protocol/discovery, skills/AGENTS checks, and plugin parity. Fixture-only files must be under `scripts/*.mjs` so the existing `test:scripts` caller proves them without a reusable harness.
- **The packet and gate contracts are machine-checkable.** MCP-023's packet is read-only and refuses in the documented order: non-ticket/legacy, spike, missing preparation docs, unresolved questions, then occupancy by another actor. CORE-024/025 provide `NO_TICKET`, `OPEN_QUESTIONS`, `WRONG_STAGE`, `DEPENDENCY_BLOCKED`, `NO_REVIEW_RECORD`, `STALE_REVIEW`, and `COMMITS_UNREACHABLE` with distinct exit/annotation behavior.
- **Project and worktree isolation are enforceable.** MCP-022 supplies optional `expected_project` fingerprints before writes; CORE-034 rejects recording the board worktree and reports board-worktree health. The disposable board must be a separate `kanmer-board` worktree, while implementation and detached verification worktrees must be distinct paths.
- **Protection is live on production and can be read as the fixture contract.** Read-only GitHub API inspection shows production `main` requires PR, exact `verify`, resolved conversations, no force push/deletion, and admin enforcement; `kanmer-board` permits ordinary direct pushes while forbidding force/deletion and requires no PR/check. The fixture must configure/read back the same narrow rules and never bypass them.
- **The authenticated GitHub capability is available for the planned probe.** `gh auth status` reports the `collisionengineers` account with `repo` and `workflow` scopes; `gh repo view` and branch-protection API reads succeed. Private-repository creation, Actions visibility, protected merge, and deletion remain live run assertions—not fabricated preconditions.
- **The group constraints are binding.** EPIC-009 requires disposable end-to-end proof and excludes leases, a GitHub App, overlay engine, and new hierarchy/stages. HZN-007 requires adjacent Kanmer stages, version-aware writes, no force-take, no source/board mutation, preserved failures, exact reachable SHAs, and no author self-review or merge. HZN-004 has no context.md.
- **No unresolved planning question remains.** CORE-035 open questions are all checked; the ticket explicitly rejects local substitutes, production fixtures, bypasses, fabricated warning/failure claims, and product fixes inside the verification lane.

## Implications

The run should use a clean disposable copy of source SHA `c8ea0b778895b0a76d9e32152a1f58c7b3b3d77b`, create a private GitHub repository and separate board branch/worktree, seed all fixture tickets through Kanmer MCP, and capture structured event records before and after every read/write/gate/protection operation. The only fixture code should be two dependency-free `scripts/` files. Any missing external capability, failing required rail, protection mismatch, or cleanup failure is retained as FAIL/INCONCLUSIVE and stops the happy path; no local mock or production substitution is valid.

## Open questions

- None. The ticket's existing open-questions document records the required decisions and all are resolved.
