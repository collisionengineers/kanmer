---
id: CORE-030
type: ticket
title: Staleness reports .claude/skills as behind with a fix that cannot work
status: backlog
area: core
assignee: ''
profile: fix
labels:
  - install
  - false-positive
links: []
refs:
  - docs/functional/frd/FRD-013-setup-as-reconciliation.md
archived: false
created: '2026-08-17T02:05:05.887Z'
updated: '2026-08-17T02:05:05.887Z'
---

## What

`get_status.repo.stale` reports, on this repo right now:

```
artefact: skills        state: behind
detail:   .claude/skills: 12 file(s) differ from the bundled skills…
fix:      run kanmer-setup, or reconnect this project in the Kanmer app

artefact: skills-stamp  state: unstamped
detail:   .claude/skills has no .kanmer-skills-version…
fix:      reconnect in the Kanmer app to write the stamp
```

**Both fixes are impossible.** Claude Code is a `marketplace` provider, so
`installSkills` (`apps/gui/src/main/connect.ts`) returns at the `kind: "marketplace"`
branch and never touches `.claude/skills`. Reconnecting cannot write that stamp,
and cannot reconcile that tree, however many times it is run.

**Confirmed empirically:** the operator reconnected Claude after installing 0.3.3
and both rows persisted unchanged.

## Why it is wrong at the root, not just in the wording

`.claude/skills` is **not a Kanmer destination at all.** [[GUI-080]]'s research
established the only `copySkills` destinations are `.agents/skills` (opencode and
Antigravity) and `.grok/skills`. On this machine `.claude/skills` is a hand-made
mirror the operator created before the plugin path worked — it even contains their
own `run-kanmer` skill, which Kanmer must never touch.

So `staleness.ts` is policing a directory Kanmer does not own, and telling the user
to run a command that cannot affect it. That is the precise failure class
[[CORE-023]]'s own self-review caught three instances of before merge; this is a
fourth that got through.

It is also newly consequential: now that [[MCP-013]] made the marketplace install
work, Claude Code loads the plugin's skills **and** the project mirror — twelve
skills registered twice, one copy stale.

## Approach

- Derive the checked destinations from what `providers.ts` actually writes, rather
  than from a mirrored list. `.claude/skills` should not be among them unless some
  provider writes it. Note [[GUI-090]] already carries the inversion that makes
  `providers.ts` the single owner of that list — this may be the same fix.
- If a foreign-but-Kanmer-shaped tree is worth mentioning at all, it is **not**
  `behind` — it is an unowned directory, and the honest state is closer to
  `unknown`, with a fix that says what it actually is.
- **Never emit a `fix` string naming an action that cannot change the artefact.**
  A warning a user cannot act on is worse than silence: they act, nothing changes,
  and they learn to ignore the report. That is the trap CORE-023's four-state
  vocabulary exists to avoid.

## Verification

- [ ] On this repo, after a Claude reconnect, no row claims `.claude/skills` is
      behind — or if a row remains, its `fix` describes something that works.
- [ ] A test covers a marketplace-only host: no `copySkills` destination, so no
      skills rows attributable to it.
- [ ] The user's own `run-kanmer` still never appears as drift.

## Outcome
