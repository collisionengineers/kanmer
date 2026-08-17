---
id: CORE-023
type: ticket
title: 'Detect when a repo''s Kanmer is older than the agent''s, and say what is stale'
status: done
area: core
assignee: claude-code
profile: feature
stageEntered:
  preparing: '2026-08-16T21:51:29.664Z'
  review: '2026-08-16T23:44:41.961Z'
  verifying: '2026-08-16T23:54:38.413Z'
  done: '2026-08-16T23:59:21.729Z'
taken_at: '2026-08-16T23:25:23.323Z'
branch: core-023-detect-stale-repo
worktree: .worktrees/core-023
labels: []
groups:
  - HZN-003
links:
  - GUI-090
refs:
  - docs/functional/frd/FRD-013-setup-as-reconciliation.md
  - docs/architecture/adr/ADR-0008-single-format-3-migration.md
  - docs/architecture/adr/ADR-0013-staleness-by-content-not-version.md
commits:
  - 61d058c
  - 0838c74
  - 3e9ee2c
prs:
  - 'https://github.com/collisionengineers/kanmer/pull/54'
archived: false
created: '2026-08-16T18:25:18.669Z'
updated: '2026-08-17T00:00:31.298Z'
---

## What

A reliable way to tell whether a repo's Kanmer artefacts match the version of
Kanmer the agent is running — and, where they do not, what specifically is
stale.

## Why

`.kanmer/version.json` records the **storage format** (currently 3), not the
product version. Migration moves ticket structure. But a repo carries far more
than ticket structure, and none of it migrates:

- the installed **skills** (`.claude/skills/`, `.agents/skills/`, …) — copies
  made at install time
- the **AGENTS.md managed block** — a literal that only changes when rewritten
- the committed **`kanmer-mcp.cjs`** bundle, if installed from a plugin fetch
- `board.yml` **profiles**, which is why [[SKILL-012]] had to inject
  `questions-resolved` at resolve time rather than rely on shipped defaults
- provider **MCP registrations** written by Connect

So a repo set up on 0.3.2 keeps 0.3.2's skills and AGENTS block indefinitely,
while the agent talks to a newer server. This repo is a live example: its
`.claude/skills/` is a **v2-era** install — still shipping `impact-template.md`
and `kanmer-import` — and reading it caused a wrong analysis earlier today.

## Approach

- Enumerate what a repo carries that is version-sensitive, and for each: is it
  migrated, reconciled by setup, or neither? The "neither" list is the answer to
  the question this ticket asks.
- Decide what "version" even means here — product version, a manifest of
  artefact versions, or content hashes. Hashes survive a user editing a skill;
  a version string does not.
- Surface the answer somewhere an agent will see it: `get_status` is the
  orientation call and the natural home.
- Reconciliation (FRD-013) is the repair path; this ticket is the detection.

## Verification

- [x] `get_status` (or equivalent) reports staleness against a repo set up on an
      older Kanmer, naming which artefacts are behind.
- [x] A repo that is current reports clean — no false positives from a user's
      own edits.
- [x] The list of not-covered-by-migration artefacts is written down, not
      implied.

## Outcome

**Shipped** in PR #54, squash-merged as `3e9ee2c`. `get_status` gains a `repo`
block beside [[MCP-012]]'s `server` block:
`{ upToDate, stale: [{ artefact, state, detail, fix }] }` — itemised, never a
bare boolean, over the AGENTS.md managed block, the installed skills trees and
their `.kanmer-skills-version` stamps, `board.yml`, and the provider MCP
registrations. Compared by **content hash**, never version string. Detection
only: `readOnlyHint` holds, every `fix` points at `kanmer-setup` (FRD-013).
Decision recorded as **ADR-0013**, which carries the enumeration table the third
acceptance criterion asked for.

**Shipped differently than planned, deliberately.** The plan inherited research's
proposal — and the operator's Q2 authorisation — to bake a content manifest into
the standalone bundle at build time. It was not used. MCP-012's `classifyBuild()`
had landed by then, which makes the bundled skills tree a *determined* sibling of
the running script in all four shapes, so the reference is discovered at runtime
instead. A baked skills manifest would have made the bundle's bytes a function of
every skill prose file, so `check-plugin-sync`'s byte comparison would from then
on have demanded an MCP rebuild after **every skill-prose edit** — including
[[SKILL-013]]'s, in flight. Net build-time inputs added: **zero**. Recorded as
alternative (b) in ADR-0013.

**Three false positives found in self-review and fixed before merge** (`0838c74`),
all narrowings with tests: a skill the user chose not to install was counted as
missing; the registration check could read another server's `--root` as Kanmer's
in any repo that merely lives in a folder called kanmer; and the skills `fix`
pointed at an "Update skills" button that has never been able to fire.

**Measured on this repo**, end-to-end through the real tool over stdio:
`.claude/skills` 3 files behind, `.agents/skills` 17 behind and unstamped,
`board.yml` `compensated` — and no row for the user's own `run-kanmer` skill or
the correctly-rooted `.mcp.json`. 36–52 ms. The motivating regression was
reproduced from the saved patch in a throwaway repo root and correctly reported
`agents-block: behind`.

**Follow-up:** [[GUI-090]] — surface the report in the GUI (operator declined the
GUI surface here as roughly doubling the ticket), and invert the two small lists
`staleness.ts` currently mirrors from `providers.ts`.

**Left to others, by design:** the stale-block *cause* is [[SKILL-013]]'s
(`agentsBlock.ts` untouched here); removing retired skills is [[GUI-080]]'s
(reported only); the binary is [[MCP-012]]'s. No `reconciledWith` field was added
to `version.json` — a field with no writer would report `unknown` forever; it
belongs with its writer under FRD-013.
