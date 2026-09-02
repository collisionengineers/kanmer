---
kind: review-attestation
pr: "311"
head_sha: "1b8f0eca8331249df3f6cdb8e122d365de563372"
verdict: pass
reviewer: "independent-review-agent (claude-opus-5, distinct role from implementer claude-code)"
independent: true
plan_hash: "24033082473d964a"
ticket_updated: "2026-09-02T01:55:08.555Z"
board_sha: "991b4ea46d47220d5b2de536d83b1bdbea8f1280"
expected_reviewers:
  - "independent-review-agent (claude-opus-5, distinct role from implementer claude-code)"
threads_snapshot:
  - source: github
    id: "PRRT_kwDOT2PEds6eVukt"
    author: "chatgpt-codex-connector"
    resolved: true
    finding: F-001
  - source: github
    id: "PRRT_kwDOT2PEds6eVukz"
    author: "chatgpt-codex-connector"
    resolved: true
    finding: F-002
  - source: github
    id: "PRRT_kwDOT2PEds6eVuk2"
    author: "chatgpt-codex-connector"
    resolved: true
    finding: F-003
  - source: github
    id: "PRRT_kwDOT2PEds6eVuk9"
    author: "chatgpt-codex-connector"
    resolved: true
    finding: F-004
findings:
  - id: F-001
    severity: major
    summary: "Claude's new user-scoped disconnect removals (`claude plugin uninstall kanmer@kanmer -s user -y`, `claude plugin marketplace remove kanmer`) fire from a per-project Disconnect button that, unlike Grok and Antigravity, shows no user-scope confirmation, so disconnecting in one project silently removes Kanmer's skills and MCP server from every other Claude workspace."
    disposition: deferred-to-ticket
    ticket: GUI-148
    reason: "Real and correctly identified, but the remedy is a renderer behaviour change that this ticket's plan explicitly forbids ('Settings.tsx - scope-aware tooltip wording only'; 'Forbidden: adding a new IPC channel, a new SkillsStatus field, or a new renderer feature surface'). The disconnect removals themselves are required by FRD-012 R4 and are correct. Genuinely out of packet scope, so deferred rather than returned, per kanmer-review's out-of-scope rule."
  - id: F-002
    severity: minor
    summary: "`stageClaudeMarketplaceRoot` refreshes each owned subdirectory with `rm` then `cp`; a failure between them leaves the marketplace root Claude Code has recorded without a complete manifest or plugin tree, and the in-code comment's claim that a half-refreshed marketplace still loads is not true when `.claude-plugin` is the directory that failed."
    disposition: accepted-risk
    reason: "Bounded, self-repairing and loud: it requires `cp` to fail after `rm` succeeded on local disk, Connect returns ok:false carrying the failing command when it does, the next Connect fully repairs it, and the pre-PR behaviour in that same window was strictly worse (the whole staged root was deleted unconditionally on every Connect). A copy-to-sibling-then-rename refresh is a genuine improvement for the next change to this function, not worth this ticket's one remediation batch."
  - id: F-003
    severity: minor
    summary: "`disconnectAgent` swallows failures from the new `hostRemoveCommands` and still reports ok:true with the note 'host marketplace registration and plugin removed', so a failed uninstall reads as a completed Disconnect."
    disposition: accepted-risk
    reason: "This is the pre-existing, deliberate contract of disconnectAgent: the `provider.register.removeCommands()` loop immediately below uses the identical `.catch(() => undefined)` and pushes the identical unconditional 'provider registration removed' note, and the plan specified best-effort 'matching the existing pattern for removeCommands'. Distinguishing 'already absent' from 'genuinely failed' changes disconnect's reporting contract for every host, which is a separate cross-provider decision and out of this packet."
  - id: F-004
    severity: minor
    summary: "`parseMarketplacePluginVersion` falls back from the requested `user` scope to `named[0]`, so a `kanmer@kanmer` block that explicitly names a different scope can satisfy Connect's read-back and skillsStatus even though the user-scope install is absent."
    disposition: accepted-risk
    reason: "Unreachable through any command this codebase issues: `claude plugin install --help` on claude 2.1.233 shows `-s, --scope` defaults to `user`, and every command this PR emits passes `-s user` explicitly, so no Kanmer code path can create a non-user-scope install. Reaching the fallback additionally needs that stray install to be at exactly the bundled version while the user-scope install failed with every command exiting 0. The fallback's real purpose - tolerating a transcript with no `Scope:` line - is legitimate; narrowing it to that case is a refinement for the next change to this parser."
  - id: F-005
    severity: note
    summary: "`skillsStatus('claude')` now spawns `claude plugin list` (60 s timeout) on every skills-staleness read, where it previously returned an unconditional `installedVersion: null`."
    disposition: accepted-risk
    reason: "Not polled - `refreshSkills` runs on Settings mount and after connect/disconnect/update - soft-failing to null by design and asserted as such, and a machine without `claude` on PATH pays one failed spawn and renders exactly as it did before. Surfacing that version is the point of the ticket. Cache it if the panel is ever found to read it often enough to matter; the PIR records the same risk."
  - id: F-006
    severity: note
    summary: "`installSkills` pushes the note 'plugin installed' once per marketplace command, so Claude's Connect output now repeats it up to three times where it previously appeared twice."
    disposition: accepted-risk
    reason: "Cosmetic output only; the pre-existing shape of that loop, unchanged by this PR, and no behaviour depends on the note text."
---

# Independent review — GUI-147, PR #311 @ `1b8f0eca`

One consolidated review (`review_round` 0) of the whole PR against the ticket
body, `research/research.md`, `files/files.md`, the 6-step plan
(`24033082473d964a`), the 10/10 checklist, the post-implementation report,
FRD-012, the MCP-013 invariant, and HZN-008's review-budget and root-cause rule.
The reviewer is a distinct agent role from the implementer and did not write any
of this code. No expected reviewer other than this one was named by the
controller; `chatgpt-codex-connector` is an automated commenter, never an
expected reviewer and never a gate, and its four threads are dispositioned above
as ordinary evidence.

## What changed

Claude Connect's plugin marketplace moves from a `mkdtemp` directory that
`installSkills` deleted in a `finally` to the installer-owned
`%LOCALAPPDATA%\Kanmer\claude-marketplace`, resolved Node-side from
`process.env.LOCALAPPDATA` with a `homedir()` fallback and refreshed per owned
subdirectory (`.claude-plugin`, `.agents`, `plugins/kanmer`) rather than
deleted. That closes defect 1: Claude Code records a *directory* marketplace by
path, so the deletion turned every later session into `Marketplace kanmer failed
to load: cache-miss` while Connect reported success.

Defect 2 — `claude plugin install` exiting 0 without upgrading an
already-installed plugin — is closed by deciding the verbs from the host's own
`~/.claude/plugins/known_marketplaces.json` and `installed_plugins.json` rather
than from CLI text (MCP-013's lesson), and then *proving* the result: Connect
now requires `claude plugin list` to report the bundled `plugin.json` version
and returns `ok:false` with the exact pasteable uninstall+install repair on a
mismatch, an absence, or an unreadable read-back. `skillsStatus("claude")`
surfaces the same read, soft-failing to `null`. Disconnect gains the two
removals FRD-012 R4 always implied, in the order `plugin uninstall` then
`marketplace remove`, and never deletes the installer-owned directory.

The sequencing lives in `providers.ts`'s `marketplaceCommands(root, state?)`
rather than as a `provider.id === "claude"` special case in `connect.ts`. That
is deviation 3 of five, all recorded honestly in the PIR; it is a better seam
than the plan's, keeps the existing staged-descriptor tests exercising the real
path, and leaves codex's spec ignoring `state` and therefore byte-for-byte
unchanged in behaviour. Deviation 1 — deciding add-vs-update on the recorded
*path* rather than on a key's presence — is the more important one and is
plainly right: the plan's literal rule would have run `marketplace update`
against the deleted temp directory every install up to v0.4.0 recorded, i.e. it
would have failed on exactly the machine that reported this bug.

## Acceptance checks

- **Production callers** — `installSkills`, `skillsStatus` and `disconnectAgent`
  are reached from `connectAgent`/`updateSkills`/the IPC handlers, unchanged; no
  new route or registration, no new IPC channel, no new `SkillsStatus` field.
- **MCP-013 invariant** — `marketplaceRoot()` and `pluginRoot()` are
  byte-for-byte unchanged and both their tests are untouched.
- **Renderer core imports** — `Settings.tsx` changed one string expression;
  `node scripts/renderer-core-imports.test.mjs` passes 6/6.
- **No weakened assertions** — the only `-` line in `connect.test.ts` across
  `main...HEAD` is an import statement that was widened. The version-mismatch
  test asserts `result.command` equals the exact repair string, which is what
  the plan's acceptance check demanded instead of an `ok !== true` weakening.
- **No real `claude` mutation** — verified: no test invokes the real binary, all
  fourteen new tests stub `LOCALAPPDATA`, `claudePluginStateDir` and
  `hostVersionRunner`, and the operator's real
  `%LOCALAPPDATA%\Kanmer\claude-marketplace` was still stamped `2026-09-02 00:44`
  after the reviewer's own full test run. The PIR's statement that the live
  Connect, `/reload-plugins` and N→N+1 upgrade evidence is deferred to
  verification and promotion is truthful and is the right boundary.

## Independent verification at this head

The reviewed content was originally pushed as `ff6a87c8`. Branch protection on
`main` sets `strict: true`, so the PR had to be brought up to date before it
could merge; `gh pr update-branch` produced `1b8f0eca`, a clean merge commit
whose parents are exactly `ff6a87c8` and `ef001344` (MCP-055, #310). All six
reviewed files are **byte-identical** between the two heads (verified by
comparing their blob object ids), and `git diff main...1b8f0eca` is the same
six-file, 912-insertion / 48-deletion change. The base moved; the reviewed code
did not. The four Codex threads were posted, dispositioned and resolved on
`ff6a87c8` and are carried forward here unchanged, and no thread has been posted
since.

Detached worktree `.worktrees/review-gui-147` at the reviewed content after
`npm install`: `npm run build -w @kanmer/core` exit 0;
`npm run build -w @kanmer/gui` exit 0;
`npx vitest run src/main/connect.test.ts --no-file-parallelism` exit 0 with
**53/53 passing**, covering all fourteen new GUI-147 tests and the untouched
MCP-013 block above them; `npm run test -w @kanmer/gui` exit 0 with
**54 files / 538 tests passing**, which is exactly the count the
post-implementation report claims; `node scripts/renderer-core-imports.test.mjs`
6/6.
CI's `verify` job is the authoritative rail and runs
`npm run build -w @kanmer/gui` then the whole-repo `npm test`; it passed in
8m2s on `ff6a87c8` and is required green on `1b8f0eca` before merge.
`kanmer-gate` reported FAILURE on both earlier runs only because no attestation
existed on the remote board yet, and is re-run after this record is pushed.

The two host-state parsers were checked read-only against the real files on a
machine running Claude Code 2.1.233: `known_marketplaces.json` is flat, keyed by
marketplace name, with `source.source === "directory"` and `source.path`;
`installed_plugins.json` is `{ version: 2, plugins: { … } }`. Both match
`claudeMarketplaceHostState()` exactly, and its current recorded path is
`%LOCALAPPDATA%\Kanmer\claude-marketplace`, so that machine now resolves to
`"staged"` → `marketplace update`. A shape that ever stops matching degrades to
`"elsewhere"` → `remove` + `add`, which is the safe verb pair — the failure mode
is one wasted re-add, never a false success.

Specifically checked, not findings: Windows path handling (`samePath` resolves
and lowercases on `win32` only, so a case-different recorded path is still
`"staged"`); a missing, empty or whitespace `LOCALAPPDATA` (falls back without
throwing, asserted); idempotency when already registered at the same path
(`update`, asserted); `claude` not installed (Connect fails loudly with the
repair, `skillsStatus` fails soft, disconnect swallows — all three asserted);
disconnect ordering (exact array equality, and the staged directory asserted to
survive); the descriptor being rewritten *after* the copy so `KANMER_BOARD_BRANCH`
survives the refresh; `mkdtemp`/`tmpdir` remaining imported only for the
unrelated native-plugin staging path at `connect.ts:1125`; and codex containment
(no `state` use, no `installedVersion`, no `hostRemoveCommands`, status and
disconnect asserted unchanged).

## Residual risk

F-002 through F-006 are dispositioned residual risk, recorded above with
reasons. F-001 is a genuine major that this ticket's packet forbids fixing here;
it is owned by **GUI-148** and should be taken before the release that ships
this, because it is a silent cross-workspace breakage of the same control plane
HZN-008 exists to protect. Every finding's disposition was posted publicly on
the PR before its thread was resolved:
https://github.com/collisionengineers/kanmer/pull/311#issuecomment-5503678403

Verification owns the live Connect run, `/reload-plugins` loading the plugin on
a real machine, and the N → N+1 upgrade yielding `claude plugin list` = N+1.
This review writes no proof and records no merge SHA.
