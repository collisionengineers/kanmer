---
kind: review-attestation
pr: "313"
head_sha: "a6eb8c1f03f4f0a7c0d755b59805ba0fc19231d6"
verdict: pass
reviewer: "independent-review-agent (claude-opus-5, distinct role from implementer claude-code)"
independent: true
plan_hash: "4c860cb46e627048"
ticket_updated: "2026-09-03T19:09:11.122Z"
board_sha: "a972a3dda051b3a09537708d142cfca667cb4924"
expected_reviewers:
  - "independent-review-agent (claude-opus-5, distinct role from implementer claude-code)"
threads_snapshot: []
findings:
  - id: F-001
    severity: blocker
    summary: "serverInvocation() also produced the OpenAI secure tunnel's --mcp-command (index.ts:1560 -> openaiTunnel.ts), so the tunnel lost the root-pinned Electron-as-Node invocation FRD-026 R3 requires and would have resolved its board by cwd discovery from a runtime Kanmer does not own."
    disposition: fixed
  - id: F-002
    severity: minor
    summary: "A board worktree attached outside the project is unreachable by ADR-0012 discovery, so a rootless Claude/OpenCode registration finds no board where the pre-GUI-149 file worked, and a hand-written --root repair is then reported behind."
    disposition: fixed
  - id: F-003
    severity: minor
    summary: "serverInvocation retained _boardRoot and _sourceRoot - accepted-and-ignored parameters that let F-001's caller change contract while still type-checking and still reading at the call site as though it pinned a board."
    disposition: fixed
  - id: F-004
    severity: minor
    summary: "isLegacyLauncherDescriptor returned on the first of ['mcpServers','mcp'] holding a kanmer object, so a file carrying a portable entry under one key and a legacy entry under the other reported clean."
    disposition: fixed
  - id: F-005
    severity: note
    summary: "connect.test.ts deleted the GUI-100 grok case (grok.command === process.execPath, --root present) rather than replacing it, dropping the only record that grok is not routed through serverInvocation."
    disposition: fixed
  - id: F-006
    severity: note
    summary: "ensureConnectIgnore reports 'added .mcp.json to .gitignore' even when the project already tracks that file, where the new rule has no effect - .gitignore does not apply to tracked paths."
    disposition: accepted-risk
    reason: "Cosmetic wording on a best-effort note that follows an already-successful registration; nothing reads the text. The author's answer - the note names what was appended, and whether the path is already tracked is the user's call - is defensible, and the remaining ask ('run git rm --cached if it is already tracked') is one clause for the next edit of this string. Carried forward unchanged from the 55c572cd attestation, where it was already accepted."
  - id: F-007
    severity: minor
    summary: "discoverabilityNote() (connect.ts, new in a6eb8c1f) calls discoverBoardRoot inside connectAgent's try block with no unit test and, unlike the neighbouring best-effort ensureConnectIgnore, no local catch: a throw from the walk would turn an already-written, successful registration into ok:false."
    disposition: accepted-risk
    reason: "New in the remediation, so it consumes no budget, and the exposure is close to nil: the walk uses existsSync (never throws), readdirSafe (which catches), and one statSync with throwIfNoEntry:false on a .git path it has just seen to exist. The residual is a mislabelled result under an exotic permission failure, not a lost registration - the registration file is already written when the note is computed. Worth a try/catch and one test the next time connect.ts's output assembly is touched."
  - id: F-008
    severity: note
    summary: "The PR body still describes the 55c572cd state: it does not mention rootedServerInvocation or the tunnel, and its Verification section cites 'npm run verify exit 0 (run 5)', which was the pre-remediation head. The squash-merge commit message body is taken from it."
    disposition: accepted-risk
    reason: "PR metadata that changes no code. Nothing in the body is false at this head - serverInvocation does return the portable contract for all three project hosts and installedElectronInvocation is gone - it is incomplete. The authoritative remediation record is on the ticket: post-implementation-report v bcbc122adb6f181d ('Remediation after review' and 'Remediation commit a6eb8c1f') and files.md v 086380fcd64b842a, which lists index.ts with its plan deviation. The binding verification evidence is the hosted CI run at this exact head, quoted below, not the body's run-5 line."
---
# Independent review (delta, round 1) — GUI-149, PR #313 @ `a6eb8c1f`

Delta review of remediation commit
`a6eb8c1f03f4f0a7c0d755b59805ba0fc19231d6` against the `needs-changes`
attestation on `55c572cd` (v `95f312e0f1bb90b7`). `review_round` is 1 and
`remediation_budget` is 1, so this is the one delta review the ticket gets: its
scope is F-001..F-006, the lines changed since the previously attested head,
their callers and contracts, and the relevant tests. The reviewer is a distinct
agent role from the implementer `claude-code` and wrote none of this code; the
controller named no other expected reviewer, so the set is settled.
`gh pr view 313 --json comments,reviews,latestReviews` and the GraphQL
`reviewThreads` surface all return empty at this head — no human review, no
comment, and no `chatgpt-codex-connector` thread — so `threads_snapshot` is
truthfully empty and there is nothing to resolve.

**Verdict: pass.** The blocker is fixed, four of the five remaining findings are
fixed rather than argued away, and `verify` is green at this exact head.

## The delta

`git diff 55c572cd..a6eb8c1f` is 7 files, +114/-24: `connect.ts`, `index.ts`,
`connect.test.ts`, `staleness.ts`, `staleness.test.ts`,
`FRD-012-connect.md`, and the regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs`.
No other file in the PR moved.

**F-001 — fixed, and provably a no-op for the tunnel.** The deleted
`installedElectronInvocation()` is restored under the name
`rootedServerInvocation(boardRoot, sourceRoot, boardBranch)` with a body that is
line-for-line the function at `cd5b6b6b` — same packaged/dev script resolution,
same `[script, "--root", boardRoot]`, same conditional `--repo-root` when
`resolve(sourceRoot) !== resolve(boardRoot)`, same `ELECTRON_RUN_AS_NODE: "1"`
env, same `process.execPath` command. `index.ts:1560` now calls it directly.
Branch normalisation is equivalent (the old path trimmed twice, the new path
once, to the same value), so the tunnel's `--mcp-command` at this head is
**behaviourally identical to `main`** and FRD-026 R3's "with the selected board
root and optional repository root" is satisfied again. `openaiTunnel.ts` and
`openaiTunnel.test.ts` are untouched by the whole PR
(`git diff --stat cd5b6b6b...a6eb8c1f -- apps/gui/src/main/openaiTunnel*` is
empty), which is what "restored, not re-implemented" has to mean. The factory is
now covered directly by "keeps the OpenAI tunnel's `--mcp-command` pinned to the
selected roots (FRD-026 R3)" in `connect.test.ts`, which asserts the command,
the root argv, the script tail, the env, and the colocated case that omits
`--repo-root`. The three secondary limbs of F-001 fall with it: a dev build can
initialise a tunnel again (the Electron path handles unpackaged), and
`shellArg` round-trips the same string it always did.

**F-003 — fixed.** `serverInvocation(id, boardBranch)` no longer accepts the roots
it ignored; both production callers (`connectAgent`,
`reconcileProviderRegistration`) and every test call site are updated, and the
JSDoc now states the rule that F-001 violated: a caller that needs a pinned
board is not writing a project registration and must say so by calling
`rootedServerInvocation`. F-001 and F-003 were one root-cause class — a factory
whose ignored parameters let a caller's contract change silently — and the
remedy is one: split the factory in two, name each for what it pins, and delete
the ignored parameters so the compiler names every consumer. Residual: `id` is
still accepted and `void`-ed. That is not the same defect — `id` is a closed
union carrying no root or binding information, every project-file host shares
one contract, and the comment says so — but it is the same shape, and the next
parameter added there should be load-bearing or absent.

**F-002 — fixed, beyond the accepted risk.** The previous attestation accepted
this as a pre-existing class needing documentation. The author documented it
*and* made it observable: FRD-012 R1e now carries an explicit **Precondition**
naming `<project>/.kanmer` or `<project>/.worktrees/<name>/.kanmer` as the
reachable layouts (exactly what `discoverBoardRoot` probes per level before the
`.git`-directory boundary), states that a board attached elsewhere is reachable
by no project-file host, and records that the OpenAI tunnel is not a project
registration and keeps the rooted form. `connectAgent` appends a warning when
`discoverBoardRoot(projectRoot)` does not resolve to the selected `boardRoot`
(`samePath` resolves and lower-cases on win32), naming both the selected board
and what discovery found instead. Connect still writes the registration, which
is the right call: Codex has behaved this way since GUI-100 and the user may be
about to move the board. See F-007 for the one thing this addition lacks.

**F-004 — fixed.** `isLegacyLauncherDescriptor` now sets a `judged` flag per key
instead of returning inside the loop, so a legacy entry under either
`mcpServers` or `mcp` is a verdict, "an entry under neither" stays `null`, and
the tri-state contract is unchanged. Two unit cases pin both directions: a
portable `mcpServers.kanmer` beside a legacy `mcp.kanmer` is `true`, and a
non-Kanmer `mcpServers` beside a portable `mcp.kanmer` is `false`.

**F-005 — fixed.** The GUI-100 selection test carries a comment recording why
there is no grok or antigravity case: `register.kind: "none"` sends them to
`connectNativePlugin` before an invocation is built. The reasoning no longer
lives only in a review record.

**F-006 — accepted-risk, carried forward** with the author's reason recorded in
the frontmatter above. It was already accepted at `55c572cd` and nothing in the
delta changed it.

**Regenerated bundle.**
`git diff 55c572cd..a6eb8c1f -- plugins/kanmer/mcp/kanmer-mcp.cjs` is exactly the
transpiled `judged` flag — five lines, no descriptor, manifest or skill change —
so the rebuild is the `mcpb:check` obligation and nothing else. `verify`'s final
step confirms it ("plugin-sync OK, bundle bytes match").

## Whole-diff pass

I re-read the full `cd5b6b6b...a6eb8c1f` diff once for anything the residual list
did not cover: `gitIgnore.ts` (the append-only helper, its last-negation-wins
rule and the symlink refusal), `connectIgnoreEntries()` (derived from the provider
spec, skipping `~`-rooted and non-project paths), `registrationRows()` (the three
portable hosts, one row per file, the deliberate `continue` that suppresses the
duplicate `--root` row), the `.gitignore` comment block, AGENTS.md §8,
`docs/manual/connect.md` and its regenerated chapter. The codex TOML path is
behaviour-preserving: `isLegacyLauncherDescriptor(text, "toml")` is
`isCurrentCodexRegistration` inverted with `null` preserved. The absolute-path
regex is anchored at a drive or root and terminated at
`kanmer.exe`/`kanmer-mcp.cjs`, so a relative script or bare command is still not
judged — which is what keeps the existing core test meaningful. Two new findings
came out of this pass, F-007 (minor) and F-008 (note); by the skill's rule a new
minor or note consumes no remediation budget and does not block, and both are
dispositioned above.

## Required checks — evidence

Hosted CI, run **33794682858** on head
`a6eb8c1f03f4f0a7c0d755b59805ba0fc19231d6` (triggered by the remediation push at
2026-09-03T19:08:34Z):

- **`verify`** — job **100779395876**, `completed` / **`success`**,
  19:08:38Z → 19:18:33Z, `head_sha` `a6eb8c1f03…`. The full Windows rail: core,
  GUI unit tests, the GUI build, the scripts tests and `mcpb:check`. This is the
  binding verification evidence for this head; the author's local run 7 agrees
  with it.
- **`kanmer-gate`** — job **100779396416**, `completed` / **`failure`** at
  19:09:31Z, with exactly one finding:
  `STALE_REVIEW … review attestation head 55c572cd90f8ad35115d0062fc52ed6e1c1d18df does not match PR head a6eb8c1f03f4f0a7c0d755b59805ba0fc19231d6`
  (`verdict: needs-changes`). Every other check in that same run passed:
  `NO_TICKET`, `OPEN_QUESTIONS`, `WRONG_STAGE` (review), `DEPENDENCY_BLOCKED` (no
  live blockers), `WRONG_TARGET` (base `main`), `NO_REVIEW_RECORD`,
  `COMMITS_UNREACHABLE` (both `55c572cd` and `a6eb8c1f` reachable) and
  `SYNC_REQUIRED` (`state: current` against fetched board tip `a972a3dd`), under
  `KANMER_GATE_STRICT: true`. The failure is therefore this attestation's own
  absence and nothing else; it is re-run after this record is written and
  pushed, and the merge waits for it to be green.
- `regate` skipped (pull-request event), as designed.

`board_sha` `a972a3dda051b3a09537708d142cfca667cb4924` is the pushed board tip
this review read: `get_status.boardSync` reports `localSha` = `remoteSha` = that
value with `ahead: 0`, `behind: 0`, and the gate above already fetched the same
tip.

## Acceptance and residual risk

The plan's five steps and both pre-review checklist items are satisfied at this
head; the single unchecked item is the `[post-merge]` real-host acceptance, which
is correctly still **INCONCLUSIVE** — no build containing this commit is
installed — and is owed at 0.4.1 (CORE-137), stated in the checklist, the
post-implementation report and the PR body. That is a verification obligation
for `kanmer-verify` and the release, not a review blocker.

Residual risk carried into the merge: F-006, F-007 and F-008 as dispositioned
above; the reachability precondition F-002 now documents (a board attached
outside the project is warned about, not refused); and the unchanged fact that
an unpackaged dev build cannot Connect a project-file host, which AGENTS.md
records. No finding of any severity is left `open`.

This review writes no proof and records no merge SHA.
