# Auto run — HZN-003 — COMPLETE

target: closeout. **28 of 29 done. One parked, for a reason no agent can remove.**
started 2026-08-16, finished 2026-08-17.

## Cleared — 23 this run

| ticket | PR | ticket | PR |
|---|---|---|---|
| GUI-074 | #37 | MCP-012 | #46 |
| GUI-069 | #38 | GUI-079 | #47 |
| GUI-072 | #39 | MCP-007 | #48 |
| MCP-010 | #40 | DOC-007 | #49 |
| GUI-080 | #41 | GUI-083 | #50 |
| SKILL-018 | #42 | MCP-011 | #52 |
| GUI-070 | #43 | GUI-071 | #53 |
| MCP-009 | #44 | CORE-023 | #54 |
| GUI-066 | #45 | GUI-073 | #55 |
| SKILL-013 | #56 | MCP-006 | #58 |
| MCP-013 | #60 | GUI-065 | #61 |
| MCP-016 | #62 | | |

Plus three chores no ticket owned: #51, #57, #59 (ADR renumbering and the
`check-doc-numbering` rail).

Already done before this run: GUI-067, GUI-078, SKILL-011, SKILL-012, SKILL-014.

## Parked — GUI-068, and it cannot be unparked by an agent

"Verify the automatic update path on the next release" needs **three** things this
run cannot produce:

1. an update **from 0.3.2 to a release that does not exist yet**;
2. a human to force and observe the refusal dialog;
3. a screenshot of that dialog — and **[[GUI-091]]**, filed this run, records that
   no agent on this host can photograph a running Electron window at all. Three
   capture routes were tried and all three failed while the renderer was provably
   alive.

Point 3 was not known when this ticket was first parked. It makes the park firmer,
not softer. GUI-091 proposes `webContents.capturePage()` from the main process —
untried, and the most likely fix; solving it would remove half of GUI-068's
dependence on a person.

## Scope changes the operator made mid-run

- **MCP-005 and MCP-008 left the horizon.** MCP-005's premise did not survive
  measurement: the lock comes from `command` (the Electron binary), not the `.cjs`,
  so relocating the script fixes nothing — the real fix relocates a 191.98 MB
  runtime. `stopMcpSessions()` holds the line meanwhile.
- **MCP-009 split.** It kept the docs; MCP-013 (in this release), MCP-014 and
  MCP-015 (outside) took the code.
- **CORE-023 shipped MCP-only**; its GUI surface is GUI-090, outside the horizon.

## Filed during the run

**In 0.3.3, and completed:** SKILL-018, MCP-013, GUI-083, MCP-016.

**Outside 0.3.3:** GUI-081 (FRD-024 R4's gate-block "?" never implemented),
GUI-082 (mis-scoped selector audit), GUI-085 (the flaky `kanmerGit.test.ts` —
GUI-086 and GUI-089 archived as duplicates of it), GUI-087 (`friendlyGateError` is
dead code, so users see raw tool names in gate banners), GUI-088 (FRD-012 R3 says
the AGENTS block is written for every provider; `installSkills` returns before
`ensureAgentsBlock` for marketplace hosts), GUI-090, GUI-091, MCP-014, MCP-015,
MCP-017, MCP-018, CORE-028, CORE-029, DOC-008, DOC-009.

## What this run should teach the next one

**1. One proxy error, three times.** Every wrong conclusion this run came from
checking a *proxy* instead of the mechanism:
- `codex mcp list` showed `enabled` for a server that never launched — this is
  what hid the broken plugin registration for MCP-009.
- A tool-list grep read as a false negative because a workspace MCP server never
  appears under its own name — it surfaces as `call_mcp_tool` / `list_resources` /
  `read_resource`. This produced MCP-009's wrong Antigravity conclusion.
- On `agy`, the plugin's entry and Connect's entry are **both named `kanmer`**, so
  a probe run inside a Connected repo answers healthily from the wrong server.
  MCP-016 caught this only by re-running from a Connect-free folder.

ADR-0009 now carries the rule: **a positive control is necessary but not
sufficient — verify the mechanism you are testing, not a proxy for it.**

**2. Parallel lanes collide on shared counters.** ADR numbering collided **three
times in one day**, and each agent was individually correct — "read the directory,
take the next free number" is right until two agents do it at once. The third
collision happened live against the PR that introduced the guard. Fixed
structurally by `scripts/check-doc-numbering.mjs`, which covers ADR, FRD and PRD.

**3. `git add -A` after a rebase is dangerous here.** DOC-007 nearly shipped a
silent revert of three merged PRs that way — deleting `identity.ts`, dropping
`test:scripts`, reverting `release.mjs` by 148 lines. It caught it by diffing every
file against `origin/main` rather than trusting the rebase.

**4. The same flaky test cost six diagnoses.** Six agents hit
`kanmerGit.test.ts`, each proved it pre-existing independently, and three filed
tickets because none could see the others'. The duplication is the visible cost;
the six diagnoses are the real one.
