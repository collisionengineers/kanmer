---
status: accepted
---

# ADR-0013 — `fix` gains a gated `enter-review`

## Context

`collapsesPipeline` refuses a move that crosses more than one **gated boundary**
(ADR-0011 Context; FRD-002 G2 as amended). It counts boundaries, not stages,
which is what lets a `spike` go Backlog → Done in one move and a `chore` jump
Backlog → Implementing — both deliberate acceptance cases.

A consequence of that counting was never decided, only inherited. Measured on the
shipped profiles with **every document present**, so the only thing that could
refuse a move was the structural rule:

```
fix      implementing -> done   ALLOWED   (skips Review AND Verifying)
chore    implementing -> done   ALLOWED
spike    implementing -> done   ALLOWED
feature  implementing -> done   REFUSED   (crosses 2 gated boundaries)
```

Only `feature` was forced through Review, and only because it happened to be the
one profile with two gated boundaries for the anti-collapse rule to catch. So on
three of four profiles `kanmer-review` could never run at all, and `proof` could
be written without `kanmer-verify` ever seeing merged `main`.

That is a real behavioural policy arrived at by arithmetic. Two of the three
cases are defensible on their own terms — a rename going straight to Done is why
profiles exist, and a spike's deliverable *is* its research. The third is not: a
`fix` large enough to open a PR is large enough to be looked at, and the profile
that skips review is also the **default** one (`DEFAULT_PROFILE_ID = "fix"`), so
it is what most tickets silently get.

## Decision

**`fix` gains `enter-review: ["post-implementation-report"]`.** In the operator's
words: *a fix that opened a PR should not merge unreviewed.*

`chore` and `spike` are explicitly **unchanged** — their one-jump to Done is kept,
not overlooked. `feature` is unchanged.

It is applied in two places, because either alone is wrong:

1. **`DEFAULT_PROFILES.fix`** (`profiles.ts`) — reaches boards created from here on.
2. **A resolve-time injection in `resolveProfiles`** (`board.ts`) — reaches every
   board that already exists. This is the SKILL-012 lesson, applied a second
   time: a board written by setup or migration carries its own `profiles:` block,
   and `board.profiles ?? DEFAULT_PROFILES` means the shipped defaults are never
   consulted for it again. Editing the constant alone would have changed nothing
   for any real board — a gap found last time by demonstrating a gate on a real
   board and watching it not fire, not by a test.

Injecting rather than rewriting `board.yml` keeps the user's configuration file
theirs, and keeps `get_doc_gates` the single authority — which is what skills are
required to derive from (FRD-023 R1). The stated cost is the one ADR-0011 already
accepted: **`board.yml` no longer lists every effective requirement.** SKILL-013
carried that fact into the AGENTS block, so agents are told where the real answer
lives rather than being left to read a file that is now partly a fiction.

### The injection is separate from the `questions-resolved` one, deliberately

They obey **opposite** rules, and merging them into one "inject a requirement"
helper is how the difference would be lost:

- `questions-resolved` may only touch boundaries a profile **already declares** —
  ADR-0011's second limit, whose entire purpose is that no profile's gated-boundary
  count changes.
- This injection **adds a boundary `fix` does not declare**, taking it from 2
  gated boundaries to 3. That is the intended effect, and it is precisely the
  operation ADR-0011's limit exists to prevent happening *by accident*. This ADR
  is the authorisation for doing it **once**, narrowly, with measurement.

Scope is as narrow as it can be: `fix` only, `enter-review` only, a no-op when the
board already says anything about that boundary — including an explicit empty
list, which is vacuous by design and stays vacuous — and a no-op on a board that
has removed `fix` entirely. Ordering is load-bearing: it runs **before** the
`questions-resolved` pass, so the new boundary inherits `questions-resolved` too.
Without that ordering `fix` would gain a review gate that does not check open
questions, which is the narrow gap ADR-0011 records; this closes it for `fix` and
deliberately leaves it open for `chore`.

## The measured effect

Every forward multi-stage move, all four profiles, every document present. Same
harness before and after; only the source under it changed. Locked into the suite
as `packages/core/src/profile-matrix.test.ts`, so the answer stays measured rather
than becoming this table.

| move | feature | fix (before → after) | chore | spike |
|---|---|---|---|---|
| backlog → preparing | ALLOWED | ALLOWED → ALLOWED | ALLOWED | ALLOWED |
| backlog → implementing | REFUSED | ALLOWED → ALLOWED | ALLOWED | ALLOWED |
| backlog → review | REFUSED | ALLOWED → **REFUSED** | ALLOWED | ALLOWED |
| backlog → verifying | REFUSED | ALLOWED → **REFUSED** | ALLOWED | ALLOWED |
| backlog → done | REFUSED | REFUSED → REFUSED | REFUSED | ALLOWED |
| preparing → implementing | ALLOWED | ALLOWED → ALLOWED | ALLOWED | ALLOWED |
| preparing → review | REFUSED | ALLOWED → **REFUSED** | ALLOWED | ALLOWED |
| preparing → verifying | REFUSED | ALLOWED → **REFUSED** | ALLOWED | ALLOWED |
| preparing → done | REFUSED | REFUSED → REFUSED | REFUSED | ALLOWED |
| implementing → review | ALLOWED | ALLOWED → ALLOWED | ALLOWED | ALLOWED |
| implementing → verifying | ALLOWED | ALLOWED → ALLOWED | ALLOWED | ALLOWED |
| implementing → done | REFUSED | ALLOWED → **REFUSED** | ALLOWED | ALLOWED |
| review → verifying | ALLOWED | ALLOWED → ALLOWED | ALLOWED | ALLOWED |
| review → done | ALLOWED | ALLOWED → ALLOWED | ALLOWED | ALLOWED |
| verifying → done | ALLOWED | ALLOWED → ALLOWED | ALLOWED | ALLOWED |

**Five cells change, all of them `fix`.** `feature`, `chore` and `spike` are
identical before and after — the "keep" decisions are measured, not assumed. Both
FRD-002 acceptance cases survive: `spike backlog → done` and
`chore backlog → implementing` are still ALLOWED.

The intended cell is `implementing → done`. The other four are the same mechanism
seen from further back: any `fix` move that *skips over* Review now crosses two
gated boundaries instead of one. A `fix` walked one stage at a time is unaffected
end to end — `backlog → implementing`, `implementing → review`,
`review → verifying`, `review → done` and `verifying → done` all still pass.

## Consequences

- **A `fix` already in `implementing` cannot move to `review` or beyond until it
  has a `post-implementation-report`.** Stated plainly because upgrades are when
  this bites. It is not a stranding: the escape is to write the report — one
  `set_ticket_doc` call — and the refusal names the missing requirement. It is
  strictly narrower than ADR-0011's own upgrade hazard, which could immobilise a
  ticket sitting in *Preparing*.
- **The awkward case is a `fix` whose PR has already merged** but which has no
  report. It must still write one before Done. That is the intended reading of
  the decision rather than an oversight — the report is the reviewer's brief and
  the record of what shipped, and a merged change with no record of what it did
  is the thing the profile change exists to stop. The release notes must say so.
- **`fix` and `feature` now differ on exactly one move**,
  `backlog → implementing`, where `feature`'s `leave-backlog` governing-doc gate
  still separates them. `fix` remains the lighter profile in *what it owes* —
  no research, no files, no checklist — not in how many stages it walks.
- **Every future profile change owes this table.** Two claims about this same
  machinery were wrong before measurement caught them (SKILL-012). The harness is
  committed so the cost of producing it again is a single test run.
- **ADR-0011's second limit is now crossed once, on the record.** It is not
  repealed. The next change proposing to add a gated boundary must produce its own
  measurement and its own ADR; the limit exists so that happens deliberately.
- **`board.yml` drifts further from the effective requirement set.** Two
  requirements are now injected at resolve time rather than written down. This is
  the accepted cost of not rewriting user configuration, and the mitigation is
  that `get_doc_gates` is the documented authority — now said in the AGENTS block
  as well as in `board.ts`.

Related: ADR-0002 (fixed six stages) · ADR-0003 (requirement profiles) ·
ADR-0009 (skills are not the contract) · ADR-0011 (gates may read open questions)
· FRD-002 · FRD-023 · SKILL-012 · SKILL-013.
