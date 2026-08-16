# Proof

Gathered on the live board, not a fixture.

**Dry run → apply parity.** Both reports printed identically: the three mapping
rows above, zero `needs-restage`, zero blockers, 40 priorities stripped, 35
`feature` / 5 `custom`, 10 document moves listed by path.

**Format stamped.**

    { "format": 3, "migratedFrom": 2, "migratedAt": "2026-08-16T03:16:16.576Z" }

**Documents relocated.** `GUI-004/` now holds `GUI-004.md`, `files/`,
`open-questions/` and `research/` — flat files gone.

**Board reshaped.** `board.yml` has no `statuses` and no `priorities`; it has
`profiles`, `defaultProfile`, `groupKinds`, `proofTypes` and `repoDocs`.

**Workable the same day** — the criterion Phase 7.1 actually sets. GUI-004 was
re-profiled as `spike` and moved Backlog → Done on `research/` alone:

    profile : spike
    reachable: backlog, implementing, review, verifying, done
    GUI-004 -> done

That ticket is the whole thesis in one line. Under v2 gates it could not close
without four retroactive documents; it had been parked for exactly that reason,
with the problem written up in its own `open-questions`. Under v3 it closes on
the work it actually did.

Then six more tickets (CORE-002…007) crossed the full four-boundary `feature`
chain on this same board.
