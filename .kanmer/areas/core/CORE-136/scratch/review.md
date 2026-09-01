---
kind: review-attestation
pr: "309"
head_sha: "1d6720c9b31e4055bc83b1942db2f7e29740f339"
verdict: needs-changes
reviewer: "claude-opus-review-core136-1d6720c9"
independent: true
plan_hash: "164599561e9c9562"
ticket_updated: "2026-09-01T21:40:12.279Z"
board_sha: "64de830f971f7670a8ad32903eb5b90e1067b894"
expected_reviewers:
  - "claude-opus-review-core136-1d6720c9"
threads_snapshot:
  - source: github
    id: "PRRT_kwDOT2PEds6eSXYv"
    author: "chatgpt-codex-connector"
    resolved: false
    finding: F-001
  - source: github
    id: "PRRT_kwDOT2PEds6eSXY4"
    author: "chatgpt-codex-connector"
    resolved: false
    finding: F-002
  - source: github
    id: "PRRT_kwDOT2PEds6eSXY8"
    author: "chatgpt-codex-connector"
    resolved: false
    finding: F-003
  - source: github
    id: "PRRT_kwDOT2PEds6eSXZC"
    author: "chatgpt-codex-connector"
    resolved: false
    finding: F-003
findings:
  - id: F-001
    severity: major
    disposition: open
    summary: >-
      Release notes instruct users that rolling back from 0.4.0 is "just
      deleting `project.json` — nothing else changes". Deletion is unnecessary
      (a pre-identity server never reads the file) and destructive
      (allocateProjectRecord mints a fresh randomUUID on the next 0.4.0 write,
      permanently discarding the logical project_id). It also understates the
      new on-disk footprint by eight artefacts under .kanmer/releases and
      .kanmer/batches. Actionable, irreversible advice in the public release body.
  - id: F-002
    severity: major
    disposition: open
    summary: >-
      "a stale write is rejected instead of silently overwriting newer work" is
      stated unconditionally, but assertRevision returns early when
      expected_revision is undefined (store.ts:1350-1351) and the code itself
      says omitting it "stays last-write-wins for every existing caller"
      (store.ts:4596-4597). The revision is document-inclusive as claimed; the
      protection is opt-in, not automatic.
  - id: F-003
    severity: minor
    disposition: open
    summary: >-
      The "Upgrading from 0.3.x" paragraph reads as general rollback safety. It
      is read-compatibility only: a v0.3.12 board write re-serialises board.yml
      through a key-stripping z.object (board.ts:260,264), silently dropping
      delivery and lease-timing keys, and v0.3.12 takeTicket is lease-unaware,
      so claiming through an old server on a 0.4.0 board can leave inconsistent
      workspace ownership. Ticket frontmatter itself does round-trip safely
      (v0.3.12 ItemFrontmatterSchema is .passthrough()).
  - id: F-004
    severity: major
    disposition: open
    summary: >-
      "is fixed at the root cause rather than retried around" is contradicted by
      the CORE-128 diff it describes: removeTreeWithRetry is itself a retry, a
      large share of the change is timeout-budget widening (core 5s->30s, GUI
      30s->120s), and antigravity-plugin-config.test.mjs:105,144 add runtime
      t.skip escape hatches letting two Windows tests silently no-op. The ticket
      is literally titled "Quarantine or fix". The follow-on sentence is also
      premature — GUI-146 (the very next commit) had to fix a broken GUI build
      before the rail was clean.
  - id: F-005
    severity: minor
    disposition: open
    summary: >-
      The section is headed "`/goal` runs a whole scope through to Done". There
      is no /goal command — no commands/ directory exists under plugins/kanmer/
      and plugin.json declares only skills and mcpServers. /goal is a trigger
      phrase in the kanmer-auto skill description. A user reading the release
      body will type /goal and get nothing.
  - id: F-006
    severity: minor
    disposition: open
    summary: >-
      "re-run `kanmer-setup` to refresh AGENTS.md and your installed skills" is
      half right. The AGENTS.md half is real (agents-block.mjs); no kanmer-setup
      step installs or re-stamps skill files — that lives in the GUI
      (connect.ts:581), and staleness.ts:484,495 tells users to "reconnect in
      the Kanmer app". Noted tension: get_status's own text points at
      kanmer-setup as the FRD-013 reconciliation path for stale skills, so the
      product's guidance is itself inconsistent here.
  - id: F-007
    severity: minor
    disposition: open
    summary: >-
      Delivery section: "whether and when it actually shipped is recorded" has
      no referent — the only timestamp is delivery_recorded_at, documented as
      when any delivery field last changed (types.ts:571-572), so an unrelated
      later edit re-stamps it. And "a hotfix's owed backport ... is tracked until
      a real commit clears it" overstates: only the 40-hex shape is validated
      (store.ts:5465-5470); nothing checks the SHA exists or is reachable.
  - id: F-008
    severity: minor
    disposition: open
    summary: >-
      Step-packet section: "An approved plan" describes a state Kanmer does not
      record — there is no plan-approval state or attestation; what is enforced
      is the leave-preparing doc gate plus validatePlan. "naming the exact files
      and symbols ... what must stay unchanged" overstates: PLAN_STEP_REQUIRED_FIELDS
      is only files/change/tests/commands/done (plan.ts:131-137) and preserved is
      advisory, so a packet can compile with empty allowedSymbols and forbiddenFiles.
  - id: F-009
    severity: minor
    disposition: open
    summary: >-
      CORE-127 section names the typed findings "forbidden, undeclared, stale, or
      inconclusive". The actual enum is StepPathClassification =
      allowed|forbidden|undeclared|inconclusive (step-packet.ts:707); "stale" is
      not a member and the sentence conflates it with the separate status enum
      pass|fail|inconclusive. Every other detail in that paragraph — the
      literal/segment-*/whole-segment-** parsing, the bare LICENSE case, the
      refusal of the next packet until PASS, and the read-only inspector — checks
      out exactly.
  - id: F-010
    severity: note
    disposition: open
    summary: >-
      "a caller can pin `expected_project` to be refused cleanly" is presented as
      new in 0.4.0, but expected_project and WRONG_PROJECT already shipped in
      v0.3.12. Only the logical UUID identity is new.
  - id: F-011
    severity: note
    disposition: accepted-risk
    summary: >-
      "without ever gating a ticket's path to Done" is literally false on one
      path: applyReconciliationLocked refuses every action including MOVE_TO_DONE
      unless release evidence is not-applicable (store.ts:3666-3671,3717-3722).
      Accepted risk — it gates the automated recovery path, not the stage machine;
      gates.ts/stages.ts/profiles.ts carry no release references and a human
      move_item is unaffected, so the sentence is defensible as written.
  - id: F-012
    severity: note
    disposition: accepted-risk
    summary: >-
      plan.md "Required changes" cites the notes draft at
      scratch/release-notes-draft.md; it actually lives in scratch/notes.md.
      Accepted risk — plan-prose path slip with no effect on the diff, the
      artefacts or the release.
  - id: F-013
    severity: note
    disposition: rejected-with-reason
    summary: >-
      The notes do not mention GUI-146's GUI-build fix. Rejected: the breakage was
      introduced by CORE-117 inside this same unreleased cycle and never shipped
      to any user, so a "0.4.0 also fixes the GUI build" line would describe a
      regression users never saw. Omission is correct and no change is wanted.
---

# Review — CORE-136 / PR #309 (`release: v0.4.0`)

Consolidated round-0 review of the v0.4.0 release PR at head
`1d6720c9b31e4055bc83b1942db2f7e29740f339`, base `main` at `3a98bf7c`.
Independent reviewer; I did not prepare this PR. As a release PR this is a
diff-shape and content check in one pass.

**Verdict: needs-changes.** The mechanical release is clean and I would have
passed it on shape alone. The blockers are all in `apps/gui/release-notes.md`,
which becomes the public GitHub release body: three claims are false or
materially overstated against the code they describe (F-001, F-002, F-004),
and six more are inaccurate in ways worth fixing in the same edit. No code
change is implied by any finding — this is one commit's worth of prose.

## Diff shape — correct

Exactly two commits, exactly nine modified files, no adds, deletes or renames:

- `0085ca80` `docs(release): add v0.4.0 notes` — touches only
  `apps/gui/release-notes.md` (+52/-0). Parent is `3a98bf7c`, the PR base.
- `1d6720c9` `release: v0.4.0` — touches only the eight artefacts
  `scripts/release.mjs` is allowed to write in its prepare phase:
  `package.json`, `apps/gui/package.json`, `package-lock.json`,
  `plugins/kanmer/.claude-plugin/plugin.json`,
  `plugins/kanmer/.codex-plugin/plugin.json`, `plugins/kanmer/plugin.json`,
  `mcpb/manifest.json`, `plugins/kanmer/mcp/kanmer-mcp.cjs`.

This matches plan.md "Required changes" 1–3 exactly; nothing under "Do not
modify" is touched. All six JSON manifests parse to `0.4.0` at the head
(including `plugins/kanmer/plugin.json` — it reads 0.3.12 on `origin/main`,
which is simply the un-bumped base, not a miss). The `package-lock.json` hunk is
version-only — three fields, zero residual `"version": "0.3.12"`. PR body carries
the `Kanmer: CORE-136` footer; base is `main` per delivery policy.

## Bundle-diff observation

`gh pr diff 309 -- plugins/kanmer/mcp/kanmer-mcp.cjs` is a single changed line:

```
-var SERVER_VERSION = true ? "0.3.12" : null;
+var SERVER_VERSION = true ? "0.4.0" : null;
```

That is the entire diff of a ~48k-line bundle. Because `scripts/release.mjs`
rebuilds the bundle *after* the bump and then runs `plugin:check` (which compares
committed bundle bytes to a fresh build), a one-line delta proves the committed
bundle on `main` was **not** stale before this release: a fresh build at 0.3.12
would have been byte-identical to what `main` carried. The compiled version
define is the only thing the bump moved. Expected, healthy, nothing to investigate.

## Release-notes content — the blockers

The `## 0.4.0` section is correctly placed above `## 0.3.12` and is the top
version section, satisfying the `release.mjs` notes guard. Coverage of the 23
merged commits in `v0.3.12..3a98bf7c` is good — every user-facing merge maps to a
section (CORE-114/115/116/117/118/121/122/123/124/125/127/128/131/132,
SKILL-036/037/038, MCP-054, GUI-144). DOC-027 is docs-only; GUI-146 is F-013.

Much of the document verifies clean, and that is worth recording: the six error
codes `WORKSPACE_OCCUPIED`, `LEASE_EXPIRED`, `REVISION_CONFLICT`,
`REMEDIATION_BUDGET_EXHAUSTED`, `SYNC_REQUIRED`, `STALE_REVIEW` all exist;
`KANMER_GATE_STRICT` is real; the registry resolves to `~/.kanmer/endpoints.json`
and genuinely reports identity, location, health, sync state **and** who is
working where (`project-registry.ts:207-291`), with write isolation proven
cross-project; the GUI Settings tab exists and is wired to
`ProjectRegistrySection`; `project.json` is allocated exactly once and
idempotently on first write; leases, batch freezing, capture promotion, release
channel identity and the CORE-127 path-matching semantics all check out in
detail. The board format is unchanged at 3, so "no migration prompt to expect"
is true.

The problems are concentrated in the compatibility prose and in three claims
that oversell:

**F-001 (major).** "An older v0.3.12 server reads straight past the file and
keeps working, so rolling back to a prior release is just deleting
`project.json` — nothing else changes." The premise is true; the conclusion
inverts it. `project.ts`'s own contract comment reads: *"A pre-identity server
never reads or writes this file, so a board carrying it stays fully readable by
the installed stable release."* Rolling back requires deleting **nothing**. And
deletion is not free — `allocateProjectRecord` mints `randomUUID()` when no
record exists, so the next 0.4.0 write allocates a **different** `project_id`.
A user who follows this instruction irreversibly loses the board's logical
identity: the value that makes copies of one board at other paths or machines
the same project, the preferred `expected_project` pin, and the `migratedFrom`
audit trail. "Nothing else changes" is also wrong on footprint — 0.4.0 adds
eight further on-disk artefacts (`paths.ts:61,72-90`).

**F-002 (major).** "Ticket writes that matter — proofs, plans, review records —
now carry a document-inclusive revision, so a stale write is rejected instead of
silently overwriting newer work." The first clause is exactly right
(`computeRevision` hashes ticket bytes plus every counted document's content
hash). The second advertises an unconditional safety property that is opt-in:
`assertRevision` starts `if (expectedRevision === undefined) return;`
(`store.ts:1350-1351`), `expected_revision` is `.optional()` on every ticket-write
tool, and the source says omitting it "stays last-write-wins for every existing
caller" (`store.ts:4596-4597`). Only `apply_reconciliation` requires it. This is
the single most misleading sentence in the document: a reader will assume a
guarantee they do not have unless they thread the token.

**F-004 (major).** "…is fixed at the root cause rather than retried around.
`npm run verify` on Windows no longer needs a retained failing attempt explained
away." Real root causes *were* found — notably a genuine production defect where
`resumeOrphanMigration` held an exclusive lock on a ~2.1s budget for a 17–19s
critical section. But the sentence as written is contradicted three ways by the
diff it describes: `removeTreeWithRetry` is itself a retry; a large share of the
change is timeout-budget widening (core 5s→30s, GUI real-git 30s→120s); and
`antigravity-plugin-config.test.mjs:105,144` add runtime `t.skip` escape hatches
that let two Windows tests silently no-op. The ticket is titled "Quarantine or
fix". The outcome sentence is also premature — GUI-146, the very next commit, had
to repair a broken GUI build before the rail was clean, and this release's own
prepare transcript records `test:http` running "with one documented Windows skip".

F-003 and F-005 through F-009 are smaller but real, and all six are one-line
edits in the same file: rollback is read-safe not write-safe; `/goal` is not an
invocable command; `kanmer-setup` does not refresh installed skills; delivery has
no "when it shipped" timestamp and validates a backport SHA by shape only;
"approved plan" is not a state Kanmer records and packet symbols/forbidden files
are optional; and "stale" is not a member of the finding enum it is listed in.

## Checks

- **`verify` (required): PASS** — hosted run 33562256156, job 100037260340,
  8m15s, at exactly `1d6720c9b31e4055bc83b1942db2f7e29740f339`. This is the full
  authoritative rail (`npm ci && npm run verify`) on `windows-latest`.
- **`kanmer-gate` (required): FAIL** — expected, and not held against the PR
  here. It ran before the board push and reported both "no scratch/review.md
  review attestation was recorded" and "CORE-136 is in stage `implementing`;
  expected review stage `review`". The board has since been pushed (CORE-136 is in
  Review at board tip `64de830f`, local == remote) and this attestation now
  exists — but with a needs-changes verdict the gate will not pass on it either.
- Branch protection on `main` requires `verify` + `kanmer-gate` (strict) plus
  `required_conversation_resolution`; 0 approvals. `mergeStateStatus` is `BLOCKED`.

## Threads

Four review threads on this head, all from `chatgpt-codex-connector`, all
unresolved, mapping to F-001, F-002 and F-003 (the last two share F-003). Codex
is not an expected reviewer and is not a gate — but on the merits all four are
correct, and I confirmed each against the code independently before adopting it.
They are deliberately left **unresolved**: they are open findings, and resolving
them would misrepresent the record. There is also one non-thread issue comment
from the same bot (its review-status summary), carrying no finding.

For the record: the head had **zero** threads at my first gather and four by my
second, four minutes after the PR opened. This attestation is written against the
re-gathered state, re-confirmed immediately before writing.

## Board and identity binding

- Board worktree tip `64de830f971f7670a8ad32903eb5b90e1067b894`, clean, on
  `kanmer-board`, identical to `git ls-remote origin kanmer-board` at the moment
  of writing. The live server is 0.3.12 and reports no `boardSync` block, so the
  skill's documented fallback comparison was used.
- `plan_hash` `164599561e9c9562`; `ticket_updated` `2026-09-01T21:40:12.279Z`.

## Residual risk

F-003 and F-005–F-009 are non-blocking and recorded so one edit can clear them
alongside the majors. F-010–F-013 are informational; F-011, F-012 and F-013 are
dispositioned without change wanted. The mechanical release path carries no
residual risk I can identify: the artefact set is exact, `plugin:check` passed at
the new version during prepare, and the bundle delta corroborates it independently.
Nothing here calls the 0.4.0 *code* into question — only how it is described.

## What I did not do

I did not merge, did not move the ticket, did not change any code or notes, and
did not resolve any thread. The Review → Implementing return is the controller's
call; this attestation is the authority for it:
`move_item CORE-136 implementing reason: "needs-changes on 1d6720c9: F-001, F-002, F-004"`.
