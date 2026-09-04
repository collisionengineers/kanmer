---
kind: review-attestation
pr: "319"
head_sha: "6637239d2af844f9fae4c59bc572ec6535341509"
verdict: needs-changes
reviewer: "claude-opus-independent-reviewer"
independent: true
plan_hash: "b71ccf61ba8b100a"
ticket_updated: "2026-09-04T07:46:33.709Z"
board_sha: "b517c405a6fecb57e81c74250f66f3d8b7338432"
expected_reviewers:
  - "claude-opus-independent-reviewer"
threads_snapshot: []
findings:
  - id: F-001
    severity: blocker
    summary: "Release notes tell users to commit the provider registration and claim a committed registration works on another machine; GUI-149 and FRD-012 R1c make Connect gitignore that exact file."
    disposition: open
  - id: F-002
    severity: major
    summary: "Notes omit that the merge gate now blocks on ANY open review finding, including minor and note (merge-gate.ts openReviewFindings lost its severity filter in SKILL-039) - a kanmer-gate behaviour change that blocks PRs 0.4.0 allowed."
    disposition: open
  - id: F-003
    severity: major
    summary: "Notes omit that Claude Code and OpenCode registrations no longer pin --root, so after the upgrade paragraph's 'reconnect each host' a board outside the project's discovery path stops resolving for those hosts; Connect only warns."
    disposition: open
  - id: F-004
    severity: minor
    summary: "'Every tool result now mirrors the full payload in structuredContent' - error results do not carry result, and the payload is nested at structuredContent.result rather than spread."
    disposition: accepted-risk
    reason: "The user-visible outcome (a structured-content client shows the whole result instead of the three-field project stamp) is true for the success path the regression affected; the nesting and the error shape are implementation detail, not a claim about behaviour the user acts on."
  - id: F-005
    severity: minor
    summary: "'One review, one remediation, one delta review is now the written budget' - that budget and remediation_budget shipped in 0.4.0 (CORE-121); SKILL-039 changed what consumes it and added kanmer-auto's approach-level replan allowance."
    disposition: accepted-risk
    reason: "Overstates novelty, not behaviour: the sentence is true of 0.4.1 as shipped, and no reader is misdirected into a wrong action."
  - id: F-006
    severity: minor
    summary: "Golden bullet precision: 18 of the 20 scenarios run against a spawned child server (GB-16 is simulated, GB-19 is a pure contract evaluation); KANMER_ROOT is stripped from server children, not literally every child; 'a fresh temp path' is a mkdtemp path under the temp volume carrying the kanmer-golden- marker, with --root refused outright."
    disposition: accepted-risk
    reason: "The safety claim the sentence exists to make - the harness can never touch a real board - is fully supported by assertDisposable, the --root refusal and childEnv; the counts are imprecise in the harness's favour and mislead no user."
  - id: F-007
    severity: minor
    summary: "'A board push with no open pull request dispatches nothing' is true of the merged board-regate.yml but takes effect only after an operator re-copies it onto the board branch; and the 'verify runs for pull requests' clause omits that metadata-only edited events are excluded."
    disposition: accepted-risk
    reason: "Both describe this repository's own CI, not a shipped artefact a user of the release operates; the merged behaviour is exactly as stated once the documented operator step is taken."
  - id: F-008
    severity: note
    summary: "'the truncated sentence in the canonical AGENTS.md operating block is complete' - CORE-139 deleted an orphan word rather than restoring lost prose."
    disposition: accepted-risk
    reason: "The paragraph is well formed at 04a97751 in all four canonical copies; the wording describes the outcome accurately enough for a release body."
  - id: F-009
    severity: note
    summary: "The MCP-055, GUI-147, GUI-149 and GUI-150 bullets state host-observed outcomes whose in-host acceptance is deferred to this ticket's own promotion acceptance (plan steps 10e, 10f, 10g); at merge time they are mechanism proven by fixtures, protocol smokes and the packaged bundle, not observed in Claude Code."
    disposition: accepted-risk
    reason: "CORE-137's plan blocks the live cut-over on 10e-10g and routes a failure to a new ticket without promoting, so the release body cannot outrun the evidence for longer than the acceptance step; the notes are published with the release, not with the promotion."
  - id: F-010
    severity: minor
    summary: "Notes omit that Disconnect for Claude now uninstalls the plugin and removes the marketplace registration (providers.ts hostRemoveCommands, FRD-012 R1a/R4)."
    disposition: accepted-risk
    reason: "Disconnect is an explicit destructive action whose new effect is the one a user asking to disconnect wants; it breaks no working setup and needs no upgrade step."
  - id: F-011
    severity: note
    summary: "CI state, not a defect in the diff: no completed verify result exists at 6637239d. The 07:42 PR-body edit cancelled the opened run's verify (run 33849909711) and the edited run (33849939736) skips verify by design, so the rail never finished at this head."
    disposition: accepted-risk
    reason: "The head is being returned for remediation and will move; the next head must carry a completed verify before any merge, re-run explicitly if a later edit cancels it again."
---

# Review — CORE-137, PR #319, head `6637239d2af844f9fae4c59bc572ec6535341509`

Consolidated review, `review_round` 0. Independent: this reviewer did not
produce the branch, the notes or the release commit.

## What the PR is

Two commits on top of `main` at `04a977516fcb29500b5df2fd6aacea24e2e3d54e`:

| Commit | Content |
|---|---|
| `4fd6998aa75078b4f25baa8da3b8329500a5ee8b` `docs(release): add v0.4.1 notes` | `apps/gui/release-notes.md`: a new `## 0.4.1` section (Fixed / Skills and policy / Proof / upgrading) inserted above `## 0.4.0` |
| `6637239d2af844f9fae4c59bc572ec6535341509` `release: v0.4.1` | `package.json`, `apps/gui/package.json`, `package-lock.json` (3 lines), the three plugin manifests, `mcpb/manifest.json`, `plugins/kanmer/mcp/kanmer-mcp.cjs` |

## Scope check — pass

`git diff 04a97751...origin/release/v0.4.1 --stat` is exactly nine files,
36 insertions and 10 deletions. Every hunk outside the notes is a single
`0.4.0` → `0.4.1` string. The committed bundle diff is one line,
`var SERVER_VERSION = true ? "0.4.0" : null;` → `"0.4.1"`, with no other byte
changed. No source, workflow, skill or governance file is touched. This matches
the plan's "Required changes (repository)" and the post-implementation report
exactly; nothing in the diff is outside the release's declared scope.

## Focused checks

Fresh detached worktree `.worktrees/release-review` at the exact head:

| Command | Exit | Result |
|---|---|---|
| `git worktree add --detach .worktrees/release-review 6637239d…` | 0 | `HEAD is now at 6637239d release: v0.4.1` |
| `npm ci` | 0 | clean install from the bumped lockfile |
| `npm run build` | 0 | core + mcp-server, standalone CJS bundle rebuilt |
| `npm run plugin:check` | 0 | `plugin-sync OK — 41 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.4.1, isolated MCP handshake lists 41 tools` |
| `node -e "…package.json/apps-gui/mcpb versions"` | 0 | `0.4.1 0.4.1 0.4.1` |

The committed bundle therefore certifies byte-for-byte against a fresh build at
0.4.1, which is the one artefact in this PR a human cannot read.

`scripts/release.mjs` line 292 refuses to publish unless `release-notes.md`
contains the version string: `0.4.1` is present, as the `## 0.4.1` heading and
throughout the section. The file's own header rule — "The top section names the
version being released" — is satisfied: `## 0.4.1` is the first section, above
`## 0.4.0`. The prepare transcript at `C:\kt-tmp\core137\prepare.log` ends
`prepare exit=0` and carries both `plugin-sync OK … manifests at v0.4.0` (the
pre-bump shared rail) and `… manifests at v0.4.1` (post-bump), which is the
correct order.

The committed `## 0.4.1` section is byte-identical to the prepared
`C:\kt-tmp\core137\notes-0.4.1.md`; nothing was edited after the check.

## Release-note accuracy — the blocker

Each bullet was checked against the merged change it describes
(`ef001344` MCP-055, `7a206202` GUI-147, `cd5b6b6b` SKILL-039, `c25e4590`
GUI-149, `4d00fbfc` CORE-139, `db5da255` MCP-056, `c973f94a` CORE-133,
`59ded74b` GUI-150, `04a97751` CORE-119) and against each ticket's
post-implementation report. Most claims hold. Three do not, and they share one
root cause.

### Root-cause class C-1 — the notes were written from each ticket's headline outcome, not from its merged behaviour delta

One remedy: one rewrite pass over the `## 0.4.1` section covering F-001, F-002
and F-003 together. Not one patch per bullet.

**F-001 (blocker).** The upgrading paragraph says:

> …and commit the rewritten portable registration and the new `.gitignore` entries.

and the Fixed bullet says:

> …so a registration committed by one machine works on another; Connect gitignores what it writes…

GUI-149 ships the opposite policy, and enforces it. `connectIgnoreEntries()`
(`apps/gui/src/main/providers.ts:92-103`) derives the registration file from the
provider spec — `.mcp.json` for Claude Code (`providers.ts:1091`),
`opencode.json` plus `.opencode/skills/` for OpenCode, `.codex/config.toml` for
Codex — and Connect appends each to the project's `.gitignore`
(`connect.ts:1465`, and `:664` on the branch-change refresh). FRD-012 R1c as
merged states it in terms: "Registration files stay gitignored, not committed…
**Connect enforces the rule itself**", because "a teammate without Kanmer
installed would otherwise inherit a server that cannot start". A user who
follows the upgrading paragraph has to `git add -f` past the ignore rule the
same release just wrote, and then ships exactly the breakage R1c exists to
prevent. The bullet's own two halves contradict each other in one sentence.

This is a false instruction in the file that becomes the GitHub release body, so
it is a blocker rather than a wording nit.

Exact replacement, Fixed bullet:

> - **Provider registrations are portable and gitignored.** Claude Code and OpenCode project registrations now use the installer-owned launcher instead of an absolute `Kanmer.exe` path and a pinned board path, so reinstalling or moving Kanmer no longer breaks them and the file names nothing machine-specific. Reconnecting rewrites an existing absolute registration, `get_status.repo` reports a pre-0.4.1 one as behind, and Connect adds each registration file — and OpenCode's project skills folder — to a git project's `.gitignore`, because a registration is a per-machine opt-in: a teammate without Kanmer installed would otherwise inherit a server that cannot start.

Exact replacement, upgrading sentence:

> Run `kanmer-setup` in each managed repository to refresh the skills and the AGENTS.md block, and commit that block and the new `.gitignore` entries; the registration itself stays untracked, so do not commit it.

**F-002 (major, omission).** SKILL-039 renamed
`openBlockingReviewFindings` to `openReviewFindings` in
`packages/core/src/merge-gate.ts` and dropped the severity filter, so **every**
open review finding — `minor` and `note` included — now blocks the gate, and
`merge-gate.test.ts` exercises exactly that. `packages/mcp-server/src/check-pr.mjs`
is the `kanmer-gate` check, so any repository running the gate will see PRs held
that 0.4.0 let through. The notes do not mention it anywhere, and it is the
largest behaviour change in the ticket the "anti-churn amendment" bullet
describes. Add to the Skills and policy bullet:

> Every open finding now blocks the merge gate, minor and note included, until it carries a terminal disposition — in 0.4.0 only blocker and major did.

**F-003 (major, omission).** GUI-149 removed the `--root`/`--repo-root`
arguments from the Claude Code and OpenCode registrations along with the
absolute `Kanmer.exe` path. Those hosts now find the board by ADR-0012
discovery from the project directory, so a board worktree attached anywhere
other than `<project>/.kanmer` or `<project>/.worktrees/<name>/.kanmer` stops
resolving for them. Connect only warns (`discoverabilityNote`,
`connect.ts:184-190`); it still writes the registration. The upgrading paragraph
tells every user to reconnect each agent host, so this is the one place in the
release where following the notes can break a working 0.4.0 setup. Add to the
same bullet:

> Because the registration no longer pins a board path, Claude Code and OpenCode discover the board from the project directory: keep the board at `<project>/.kanmer` or under `<project>/.worktrees/`, and reconnect will warn when it is somewhere else.

### Accepted minors and notes

F-004 through F-010 are recorded above with their reasons. They are precision
and omission points that do not change what the release is or what a user must
do: the `structuredContent` shape (errors excluded, payload nested under
`result`), the review-budget sentence overstating novelty, the golden harness's
scenario counts and environment stripping, the board-regate operator step and
the `edited`-event exclusion, the AGENTS.md wording, the host-observation
evidence still owed to this ticket's own acceptance, and Disconnect's new
Claude uninstall. Each is residual risk, accepted, and none of them alone or
together would have produced a `needs-changes`.

## Checks and threads

- `verify` — **skipped** at this head. Run `33849909711` (`pull_request`) was
  cancelled at 07:42:36 by workflow concurrency when the author edited the PR
  body; run `33849939736` is the resulting `edited` event, and `pr.yml` skips
  `verify` for `edited` by design (AGENTS.md §6). The rail therefore has **no
  completed result** at `6637239d`. Recorded as F-011; the next head must carry
  a finished `verify` before any merge decision.
- `kanmer-gate` — **fail**, run `33849939736`, job `100950317749`, strict.
  Findings `WRONG_STAGE` (the board snapshot `b517c405` still had CORE-137 in
  `implementing`) and `NO_REVIEW_RECORD`. Both are expected for a gate that ran
  before this attestation existed; neither is evidence about the diff.
- `regate` — skipped (correct: not a dispatch or a push to `main`).
- Review threads on the head: **none**. `reviewThreads`, `reviews` and
  `comments` are all empty via GraphQL at gather time, so `threads_snapshot` is
  an empty list truthfully. No `chatgpt-codex-connector` thread exists on this
  head; none was waited for.
- Base: `main` is still `04a97751`, `mergeable` MERGEABLE,
  `mergeStateStatus` BLOCKED. The head is not BEHIND.

## Verdict

`needs-changes`. The diff is exactly right and the artefacts certify; the
release body is not truthful about what the release does to a provider
registration, and omits two behaviour changes a user or a CI operator needs.
Remediation is one rewrite pass over `## 0.4.1` on this same branch and PR,
covering F-001, F-002 and F-003. No new version bump is needed — the notes
commit can be amended or a third commit added; either way `plugin:check` must
stay green and the diff must stay inside the same nine files.
