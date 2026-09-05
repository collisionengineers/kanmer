---
name: kanmer-verify
description: Verify a reviewed and merged Kanmer ticket at the exact GitHub merge SHA in a disposable detached worktree, write the versioned proof record with every attempt, and move Verifying→Done only for a truthful PASS. Use after kanmer-review has merged a PR and moved the ticket to Verifying. DO NOT USE for pre-merge review, implementation, or git cleanup. Never update the mutable main checkout as a side effect.
---

# Kanmer verify

Verification is evidence of what shipped, not evidence of whatever `main` has
become since review. The source is the PR's exact GitHub `mergeCommit` SHA.
Verification happens in a disposable detached worktree named from that SHA;
the mutable `main` checkout, the board worktree, and the implementation
worktree remain untouched.

## Workflow

1. Read `get_item` and `get_doc_gates`; confirm the ticket is Verifying and
   retain the PR identity and packet commands. On any resumed or suspicious
   Review/Verifying ticket, call `reconcile_ticket id: <ID>` as a dry run first
   and, only when it returns a recommendation, apply that recommendation with
   `apply_reconciliation id: <ID>, expected_revision: <the recommendation's
   revision>` before re-reading
   anything by hand — the inspector never mutates, and its typed evidence names
   the unexplained state faster and more truthfully than a manual re-read.
2. Ask GitHub for `state`, `mergeCommit`, and `url`. If the PR is not `MERGED`
   or `mergeCommit` is null, stop immediately: this skill is running too early.
3. **Look up the bound receipt before any Git operation.** The push to `main`
   that the merge itself triggered already ran `pr.yml`'s `verify` job for
   this exact merge SHA — the "bound post-merge receipt" the workflow's own
   comment names. Query it before creating anything.
4. **Classify each packet obligation** as `satisfied`, `missing`, or
   `rejected` against that receipt.
5. **Create the detached verification worktree only if step 4 left anything
   missing.** A fully satisfied receipt needs no new full run and no
   verification worktree at all.
6. Run only the missing checks there. Record every command, cwd, exit code,
   observed result, and summary; preserve failures and inconclusive attempts.
7. Replace `proof/proof.md` as one version-aware proof record — the receipt
   that discharged an obligation goes in `receipts:`, and any check actually
   run goes in `attempts:`. Only a truthful top-level `PASS` may proceed to
   the Done gate. Give every non-PASS result a `failure_class` and route it by
   the table below: `transient` retries in Verifying, `inconclusive` waits in
   Verifying, `implementation` returns to Implementing, `plan` returns to
   Preparing. A failure that is irrecoverable or superseded may instead use
   the explicit terminal-retirement path below, but only with the operator's
   disposition. PASS moves only `verifying` → `done`. Both terminal paths hand
   off to closeout.

## Confirm the merge before touching Git

The PR is the authority for the merge SHA:

```sh
gh pr view <pr> --json state,mergeCommit,url
```

Require `state: "MERGED"` and a non-null, full `mergeCommit.oid`. A source
branch SHA, a ticket `commits[]` entry, or the current `origin/main` is not a
substitute. Preserve the exact unmerged response in verify scratch and stop;
do not create a proof record, move the ticket, fetch a guessed ref, or update
main.

## Look up the bound receipt before any Git operation

Before creating a worktree, ask GitHub for the push-to-`main` run `pr.yml`
already ran for the exact merge SHA:

```sh
gh run list --workflow pr.yml --event push --commit <MERGED_SHA> --limit 5 --json databaseId,headSha,event,status,conclusion,url,createdAt
gh run view <databaseId> --json jobs,conclusion,status,attempt,headSha,url
```

**Satisfied** only when ALL of the following hold: `headSha` string-equals
the full merge SHA; `event == push`; the workflow is `pr.yml`; and a job
named `verify` has `status: completed` and `conclusion: success`.

**Rejected** — not merely missing — for: `cancelled`, `skipped`,
`timed_out`, or `action_required`; no `verify` job present; or a run that
only exists for the `pull_request` event on the PR's head SHA. A PR-head run
or a synthetic-merge run is never interchangeable with the actual squash
commit pushed to `main` — they are different commits with different history,
even when their diffs match.

**In progress**: wait once with `gh run watch <databaseId> --exit-status`
rather than starting a competing local rail. Do not poll repeatedly and do
not fall back to a local run while the bound run is still queued or running.

## Classify packet obligations

Classify each of the packet's named obligations as `satisfied`, `missing`, or
`rejected` against the receipt looked up above:

- An obligation that is a subset of `npm run verify` — the `verify` job in
  `pr.yml` runs exactly the packet's `VERIFY_STEPS` — is `satisfied` by a
  `satisfied` receipt. Do not re-run it locally.
- Manual GUI checks, installed-host checks, Windows-lock checks, and any
  provider/deployment check stay `missing` regardless of the receipt: the
  hosted rail cannot observe them, so they are always run in the worktree as
  today.
- A `rejected` receipt (see above) leaves every obligation it would have
  covered `missing` — reject it explicitly in the proof rather than silently
  falling back.

## Exact detached worktree

**Create this worktree only if the classification above left something
missing.** A fully `satisfied` receipt needs no new full run and no
verification worktree at all — skip straight to writing the proof with the
receipt in `receipts:` and no new `attempts:`.

When something is missing, from a normal repository checkout (never
`.worktrees/kanmer`):

```sh
git fetch origin
git worktree add --detach .worktrees/verify-<id-lowercase>-<full-merged-sha> <full-merged-sha>
```

Use the full SHA in both the directory name and the worktree argument. Confirm:

```sh
git -C .worktrees/verify-<id-lowercase>-<full-merged-sha> rev-parse HEAD
git -C .worktrees/verify-<id-lowercase>-<full-merged-sha> symbolic-ref --short -q HEAD
git -C .worktrees/verify-<id-lowercase>-<full-merged-sha> status --short --branch
```

`rev-parse HEAD` must equal the PR's full `mergeCommit.oid`, symbolic-ref must
be empty (detached), and status must be clean. If any assertion fails, record
the exact command and exit, stop, and do not repair by checking out or pulling
`main`. Never switch branches, reset, or update a mutable checkout as part of
verification. The detached worktree is disposable; do not
remove the ticket's implementation worktree or its branch.

If the deterministic verification path already exists, refuse to overwrite
it unless it is a clean detached worktree at this same full merge SHA. An
existing path owned by another ticket or pointing at another SHA is a stop and
report condition; do not reuse it by force or choose an unrecorded alternate.

## Run and record the evidence

Read the plan/checklist and packet command hint already bound to the ticket,
then run only the checks classification left `missing`, in the detached
worktree. Give this
verification its own log paths, named from the ticket and merged SHA: two
verifiers running at once and sharing one log file destroy each other's
evidence. Do not
invent a green result for a manual GUI, hosted GitHub, provider, deployment,
or Windows-lock check that is unavailable. Record that attempt as
`INCONCLUSIVE` with exit code `null` when no process ran. A failed command is
`FAIL` with its exact non-zero exit; if a later retry passes, retain both
attempts in chronological order.

For each attempt record:

```yaml
- attempted_at: "<ISO-8601 timestamp>"
  command: "<exact command or manual check>"
  cwd: "<repo-relative or injected detached path>"
  exit_code: 0 # integer, or null for manual/inconclusive
  result: PASS # PASS | FAIL | INCONCLUSIVE | NOT_APPLICABLE
  summary: "<observed output/result synopsis>"
```

## Whole-file proof record and Done gate

Read `get_ticket_doc(id: <ID>, doc: "proof")` first. Replace it with
`set_ticket_doc` and pass the returned version as `expected_version`; do not
append a proof frontmatter record. The frontmatter is exactly:

```yaml
kind: proof-record
merged_sha: "<full merge commit SHA>"
environment: "<detached verification worktree and runtime>"
verified_at: "<ISO-8601 timestamp>"
result: PASS
attempts: []
```

`merged_sha`, environment, and timestamp are non-empty. The top-level result
is exactly `PASS | FAIL | INCONCLUSIVE | NOT_APPLICABLE | WAIVED_BY_OPERATOR`.
`WAIVED_BY_OPERATOR` is a human disposition only and requires the operator
identity and reason in the body; it is not a normal attempt result and the
verifier never writes it on its own authority. Keep every failed or
inconclusive attempt when a later run passes.

When step 3 found a satisfied receipt, add it beside `attempts:` as one
`receipts` entry per obligation it discharged. This is additive: a proof with
no `receipts` key behaves exactly as it did before this list existed, and
existing proofs are never rewritten to add one.

```yaml
receipts:
  - kind: github-actions-run
    provider: github
    repo: collisionengineers/kanmer
    workflow: pr.yml
    event: push
    run_id: 1234567890
    attempt: 1
    head_sha: "<full merge SHA — must equal merged_sha>"
    job: verify
    conclusion: success
    url: "https://github.com/collisionengineers/kanmer/actions/runs/1234567890"
    covers: ["npm run verify"]
    observed_by: "<actor>"
```

A receipt whose `head_sha` disagrees with `merged_sha` is rejected by
`assessReceipt` and by the reconciliation classifier's
`PROOF_RECEIPT_SHA_MISMATCH` finding — it never authorises Done, whichever
way it would otherwise route the ticket.

When the result is `FAIL` or `INCONCLUSIVE`, add one more key:

```yaml
failure_class: implementation # implementation | plan | transient | inconclusive
```

- `implementation` — the shipped code or artefact is wrong against the plan
  and governing docs (a real failing assertion, a missing production caller,
  a broken artefact).
- `plan` — the code does what the plan said and the plan is what is wrong
  (an acceptance check that cannot be true, a governing-doc conflict, an
  unmet requirement the plan never covered).
- `transient` — the environment, not the change: flake, timeout under load,
  a hosted service unavailable, a known host quirk already recorded on the
  board. **`transient` is a conclusion you earn, never one you assert.** A red
  run — local or hosted — is discharged only with all three of: a re-run of the
  same job at the same SHA with no code change, a confirmation that the failing
  test or file is untouched by this diff, and a mechanism argument for why the
  change cannot reach it. Retain every attempt, red and green, in the proof.
  Judging by a hosted rail is necessary and not sufficient: a single red hosted
  run is no more proof of a regression than a single green local run is proof of
  correctness.
- `inconclusive` — no process ran or the evidence cannot distinguish the
  three above; say what would make it conclusive.

The class routes the ticket. The verifier writes the proof; the move itself
is the controller's or operator's, made with `move_item` and a `reason` that
quotes the proof (every backward move is audited under `## Transitions`):

| `failure_class` | Next stage | How |
|---|---|---|
| `transient` | stays in Verifying | rerun the failed check; retain both attempts. Never the default: a proof that names no class is treated as `inconclusive`, not as retryable. |
| `inconclusive` | stays in Verifying | report the unavailable check and what would make it conclusive; hosted rails may be authoritative. Default for any non-PASS proof that names no class. |
| `implementation` | `verifying` → `implementing` | `move_item` with `reason: "proof FAIL implementation: <summary>"`; the fix reuses the same ticket, branch and worktree, but the reviewed PR is already merged, so the fix necessarily opens a new PR against the integration target and the next review binds to that new PR. |
| `plan` | `verifying` → `preparing` | `move_item` with `reason: "proof FAIL plan: <summary>"`; the plan is revised through `kanmer-plan` before any new implementation. |

## What is validated by code and what is human judgement in this release

Code validates: receipt shape (`kind`, `job`, `run_id`, `url` present),
`head_sha` exactly matching the PR's merge SHA, `event == push`, the job
named `verify`, and `conclusion == success`. `assessReceipt` and the
reconciliation classifier's `PROOF_RECEIPT_SHA_MISMATCH` finding enforce
these mechanically; a receipt that fails any of them is `rejected`, not
merely unused.

The human recording the proof is responsible for two judgements this release
does not automate:

- **Provider provenance** — that the receipt genuinely names the GitHub Actions
  run it claims to (not a forged or hand-edited value), and that
  `observed_by` names the actual actor who looked it up.
- **"packet ⊆ npm run verify" coverage** — that every obligation marked
  `satisfied` by the receipt is actually a subset of what the `verify` job in
  `pr.yml` runs. A packet obligation that is not part of `VERIFY_STEPS` stays
  `missing` and is run in the worktree regardless of the receipt, and it is
  the verifier's judgement, not a mechanical check, that draws that line
  correctly for a given ticket's packet.

Read a proof record **in full** before acting on it, your own or an earlier
one — the frontmatter carries the only machine-readable verdict, and prose
appended below it can contradict `result:`. A frontmatter-only read is how a
failed attempt gets reported as a pass.

Only `PASS`, or an operator's `WAIVED_BY_OPERATOR`, permits the final move.
Call `get_doc_gates` immediately before `move_item`; move one boundary only,
`verifying` → `done`. If any required check failed or is unavailable, write
the truthful record and remain in Verifying until it is routed. Do not turn
the structural existence gate into a claim that the shipped result passed.

## Terminal retirement after failed verification

A non-PASS result is retryable by default. Do not infer terminal failure from
age, a second ticket, a failed command, or an agent's preference. Leave the
ticket active in Verifying while a rerun or remediation can still make its own
acceptance criteria true.

When the result cannot be repaired in place — for example an immutable release
attempt — the operator may explicitly declare it irrecoverable or superseded.
That disposition must name a reason and either a successor ticket or the
operator's explicit no-successor decision. Then, in this order:

1. preserve the final non-PASS `proof/proof.md` and read it back;
2. link the successor when one exists;
3. add an `## Outcome` note that names the operator, reason, proof result and
   successor/no-successor disposition;
4. set `archived: true` without changing the ticket's Verifying status; and
5. hand off to `kanmer-closeout` for traceability, Git cleanup and release.

Retirement is a terminal **non-success** outcome. Never move a non-PASS ticket
to Done, delete it, erase failed attempts, or archive it automatically. Archive
keeps the evidence recoverable while removing work that has an explicit
terminal disposition from the active board.

After the proof has been read back and either the Done move or explicit archive
succeeds, remove only the disposable detached verification worktree with the
exact recorded path. Keep the implementation worktree and branch for closeout,
and report cleanup and any failure to the next skill. No verification step
merges, rewrites, or pulls main.

---

**Hand off to `kanmer-closeout`** after either the exact merged-SHA PASS (or
operator waiver) and Verifying → Done move, or an operator-disposed non-PASS
retirement that remains Verifying and is archived; an `implementation` or
`plan` failure hands off to `kanmer-execute` or `kanmer-plan` instead through
the routed backward move. Closeout owns final traceability, release, and
cleanup; this skill never self-reviews, merges, or mutates the board worktree.
