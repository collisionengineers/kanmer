---
status: draft
---

# FRD-032 — Quick capture and promotion

**Implements:** PRD-002 requirement 5.

## Behaviour

Kanmer supports a lightweight capture mode for an observation. A capture stores
a concise title, observation/why, optional screenshot/file/link, known area and
created timestamp/actor. It remains visible in Backlog, searchable and
filterable, but does not acquire `docs_todo` automatically, does not count as a
stalled planned ticket and is excluded from goal selection and readiness metrics.

Promotion is an explicit recorded decision: duplicate merged/archived, already
fixed with outcome archived, added to an explicit small-fix batch, promoted to a
normal ticket/profile, retained as a capture or archived as no longer required.
Promotion never silently selects a capture for autonomous delivery.

## Acceptance criteria

1. A user can create and search a capture with only the required observation
   fields and no delivery-document debt.
2. A goal roster and readiness view exclude unpromoted captures.
3. Each promotion outcome records its chosen disposition and resulting link or
   ticket where applicable.
4. Promoting to a normal ticket applies its selected profile and normal gate
   requirements only from that decision onward.

## Edge cases

- Empty optional evidence is valid; missing title or observation is refused.
- A capture may remain in Backlog indefinitely without appearing as an expired
  plan or claim.
