---
kind: review-attestation
pr: "313"
head_sha: "55c572cd90f8ad35115d0062fc52ed6e1c1d18df"
verdict: needs-changes
reviewer: "independent-review-agent (claude-opus-5, distinct role from implementer claude-code)"
independent: true
plan_hash: "4c860cb46e627048"
ticket_updated: "2026-09-03T17:11:54.009Z"
board_sha: "57f6903ff859f12326c4a35ee62f20ed77a0f9bb"
expected_reviewers:
  - "independent-review-agent (claude-opus-5, distinct role from implementer claude-code)"
threads_snapshot: []
findings:
  - id: F-001
    severity: blocker
    summary: "serverInvocation() now returns the rootless portable launcher for every caller, silently changing the OpenAI secure-tunnel MCP target at index.ts:1560 -> openaiTunnel.ts:421 from the root-pinned Electron-as-Node invocation FRD-026 R3 requires to a launcher with no board or repo root; the tunnel-client runtime outlives the app (FRD-026 R4), so its MCP child resolves whatever board ADR-0012 cwd discovery finds, which can bind one profile to another project's board (FRD-026 R1). Untested, out of the plan's declared scope, and unmentioned in files.md or the post-implementation report."
    disposition: open
  - id: F-002
    severity: minor
    summary: "A board worktree attached outside the project (kanmerGit.ts:547-548 adopts it at any path; discover.ts:92 says .worktrees/kanmer is a convention, not an invariant) is unreachable by cwd discovery, so rootless Claude/OpenCode registrations find no board where the pre-GUI-149 file worked; a hand-written --root repair is then reported 'behind' and reconnect deletes it."
    disposition: accepted-risk
    reason: "Pre-existing class: Codex has carried exactly this since GUI-100 and the FRD-012 R1e amendment is a deliberate choice of ADR-0012 discovery over pinning. The failure is loud (no board found), not silent corruption. The remaining ask is documentation - R1e/R7 should state the discoverability precondition - which does not warrant this ticket's remediation batch."
  - id: F-003
    severity: minor
    summary: "serverInvocation (connect.ts:131-140) retains _boardRoot, _sourceRoot and `void id;` - three parameters that no longer affect the result. Preserving the signature to avoid caller churn is exactly what let F-001's caller change contract while still type-checking and still reading as though it pinned a board."
    disposition: open
  - id: F-004
    severity: minor
    summary: "isLegacyLauncherDescriptor (staleness.ts:763) returns on the first of ['mcpServers','mcp'] that holds a kanmer object, so a file carrying a portable mcpServers.kanmer and a legacy mcp.kanmer reports clean even though the loop reads as 'check both'."
    disposition: accepted-risk
    reason: "Unreachable through any file Kanmer writes or any host it supports: .mcp.json owns mcpServers and opencode.json owns mcp, and no provider writes both keys into one file. Collecting from every key before deciding is a two-line refinement for the next change to this function."
  - id: F-005
    severity: note
    summary: "connect.test.ts:593 deletes the GUI-100 grok case (grok.command === process.execPath, --root present) rather than replacing it, dropping the only assertion that grok is not routed through serverInvocation."
    disposition: accepted-risk
    reason: "Verified unreachable in production: grok's register.kind is 'none', so connectAgent returns via connectNativePlugin before serverInvocation is called and reconcileProviderRegistration bails on the missing configPath. The coverage loss is real but pins behaviour that no code path can reach; a one-line comment would carry the reasoning."
  - id: F-006
    severity: note
    summary: "ensureConnectIgnore (connect.ts:155-159) reports 'added .mcp.json to .gitignore' even when the project already tracks that file, where the new rule has no effect at all - .gitignore does not apply to tracked paths."
    disposition: accepted-risk
    reason: "Cosmetic wording on a best-effort note; the registration itself has already succeeded and nothing depends on the text. Worth one clause ('run git rm --cached if it is already tracked') the next time this string is edited."
---
# Independent review — GUI-149, PR #313 @ `55c572cd`

One consolidated review (`review_round` 0) of the whole PR against the ticket
body, `files/files.md`, the 5-step plan (`4c860cb46e627048`), the 8-item
checklist, the post-implementation report, FRD-012 (R1, R1a, R1c, R1d, R1e, R4,
R7), FRD-026 (the OpenAI secure tunnel), ADR-0012 and ADR-0013. The reviewer is
a distinct agent role from the implementer and wrote none of this code. The
controller named no other expected reviewer. The head carries no GitHub review,
comment or thread at all (`gh pr view 313 --json reviews,comments` → both empty),
so `threads_snapshot` is truthfully empty.

**Verdict: needs-changes.** One blocker (F-001) plus a failing required check.

## What changed

`serverInvocation()` (`apps/gui/src/main/connect.ts:131`) stops branching on
provider id: every caller now receives `portableLauncherInvocation(branch)` —
`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& (Join-Path
$env:LOCALAPPDATA 'Kanmer\bin\kanmer-mcp.cmd')"` with `KANMER_BOARD_BRANCH` as
the only env entry. `installedElectronInvocation()` is deleted, so `.mcp.json`
and `opencode.json` no longer serialise `process.execPath`, the bundled
`kanmer-mcp.cjs`, `--root`, `--repo-root` or `ELECTRON_RUN_AS_NODE`.
`probeLauncher()` gates all three project-file hosts before any write. A new
shared `apps/gui/src/main/gitIgnore.ts` carries `ensureIgnore`/
`ignoreEntriesToAppend` out of `kanmerGit.ts` (now returning what it appended),
and `ensureConnectIgnore()` (`connect.ts:152`) appends each provider's
`register.configPath` and project-scoped `install.skillsDir/` to the target
project's `.gitignore` when `<project>/.git` exists — best-effort, reported in
the Connect output, never `ok:false`. Core gains
`isLegacyLauncherDescriptor()` (`packages/core/src/staleness.ts:750`) and wires
it into `registrationRows()` for the three portable hosts on Windows.

The scope discipline is otherwise good: `.claude-plugin/**`, `.agents/**`,
grok/antigravity provider entries and the installer scripts are untouched, and
grok's `register.kind: "none"` means the unconditional probe cannot reach it.

## Independent verification at this head

Live, on this machine, not assumed:

1. **The `&` survives `execFile` into `.mcp.json` — the plan's central premise
   holds.** In a scratch git repo outside every real repo (`C:\kt-tmp\review-149`,
   since removed) I ran the exact production argv through `child_process.execFile`
   with `shell: false` against `C:\Users\Alex\.local\bin\claude.exe` (2.1.259):
   `["mcp","add","kanmer","-s","project","-e","KANMER_BOARD_BRANCH=kanmer-board","--","powershell.exe","-NoProfile","-ExecutionPolicy","Bypass","-Command","& (Join-Path $env:LOCALAPPDATA 'Kanmer\bin\kanmer-mcp.cmd')"]`.
   The produced `.mcp.json` is byte-for-byte the R1e contract, `&`, single
   quotes and backslashes verbatim, `"type": "stdio"` added by the CLI:
   `command: "powershell.exe"`, `args: ["-NoProfile","-ExecutionPolicy","Bypass","-Command","& (Join-Path $env:LOCALAPPDATA 'Kanmer\\bin\\kanmer-mcp.cmd')"]`,
   `env: { KANMER_BOARD_BRANCH: "kanmer-board" }`. Removed afterwards with
   `claude mcp remove kanmer -s project`. No real repo's `.mcp.json`, no
   user-scope server in `~/.claude.json` and no plugin/marketplace state was
   touched.
2. **Whether that file actually starts the server: INCONCLUSIVE, blocked by
   approval.** `claude mcp list` in the same directory reported
   `kanmer: powershell.exe … - ⏸ Pending approval (run \`claude\` to approve)`.
   That is exactly the condition the new Claude output note describes, so the
   note is corroborated rather than speculative; proving the handshake needs an
   interactive approval this review may not give. Real-host acceptance stays
   owed, as the checklist's post-merge item already says.
3. **The launcher itself is healthy from an ordinary project cwd.** Running the
   production probe string (`$ErrorActionPreference='Stop'; & (Join-Path
   $env:LOCALAPPDATA 'Kanmer\bin\kanmer-mcp.cmd') --probe; exit $LASTEXITCODE`)
   from the scratch repo printed `Kanmer MCP launcher: healthy`, exit 0.
4. **OpenCode's schema matches.** Fetched https://opencode.ai/docs/mcp-servers/:
   a local server is `mcp.<name>` with `type: "local"` (string), `command`
   (array of strings), optional `environment` (object), `enabled` (boolean),
   `cwd` and `timeout`. `opencodeMerge` emits exactly `{ type, command,
   environment, enabled }` and is unchanged by this PR; the array form carries
   the PowerShell argv without a shell, so nothing here needs the `&` to be
   re-parsed.
5. **Tests, run in the worktree.** `apps/gui`:
   `npx vitest run --no-file-parallelism src/main/providers.test.ts
   src/main/connect.test.ts src/main/index.sync.test.ts` → 3 files, **139
   passed**, exit 0. `packages/core`: `npx vitest run src/staleness.test.ts` →
   **56 passed**, exit 0.
6. **The plugin-bundle deviation is what it claims to be.** `git diff
   cd5b6b6b..55c572cd -- plugins/kanmer/mcp/kanmer-mcp.cjs` is 51/5 lines and
   contains only the transpiled `isLegacyLauncherDescriptor`,
   `PORTABLE_LAUNCHER_*` and the `registrationRows` rewiring — no descriptor,
   manifest or skill change. Regenerating it is forced by `mcpb:check` inside
   `npm run verify`, so the "Do not modify `plugins/**`" deviation is
   unavoidable and correctly disclosed.

**No weakened assertions.** Every removed expectation is an assertion of the
behaviour this ticket deliberately deletes (`ELECTRON_RUN_AS_NODE` in the env,
`process.execPath` as the command) and each is replaced by a stronger one — a
`toEqual` on the whole portable descriptor plus a `not.toMatch(/Users|Kanmer\.exe|
kanmer-mcp\.cjs|--root|--repo-root|cwd|ELECTRON_RUN_AS_NODE/)` guard in both
`providers.test.ts` and `connect.test.ts`. The many `{ probeRunner: probeOk }`
additions are required by the now-unconditional probe, not a loosening. The
`kanmerGit.test.ts` edits are the renamed symlink-refusal message only, and both
symlink assertions survive. The new GUI-149 blocks add real coverage: probe
failure writes nothing for claude and opencode (`.mcp.json`, `opencode.json`
and `.gitignore` all asserted absent), the `.gitignore` append is exact-string
and idempotent, a non-git project is left alone, and the R1f reconcile path is
covered separately.

## Deviations from the plan — judged

- `plugins/kanmer/mcp/kanmer-mcp.cjs` regenerated against the plan's "Do not
  modify `plugins/**`": **accepted**, verified above, and the right call — the
  alternative is a red `mcpb:check`.
- `apps/gui/src/main/index.sync.test.ts`: **accepted**. It pinned the Electron
  env shape on the production reconcile caller; the replacement asserts the
  portable env *and* `command === "powershell.exe"`, which is stricter.
- `apps/gui/src/renderer/src/manual/chapters.generated.ts`: **accepted**,
  mechanical output of `npm run build:manual` for the `docs/manual/connect.md`
  edit, one line.
- AGENTS.md §8 gotcha 4 corrected alongside the planned §8 rewrite:
  **accepted** — the sentence "Project-scoped `connect.ts` registrations may
  still invoke the install-root `Kanmer.exe` directly" becomes false with this
  commit, so leaving it would ship a lie in the file agents read first.
- `isLegacyLauncherDescriptor` narrowed to *absolute* `Kanmer.exe`/
  `kanmer-mcp.cjs`: **accepted and better than the plan** — it preserves the
  existing core test that a bare `node kanmer-mcp.cjs` with no `--root` is not
  stale.
- Symlink-refusal test for `ensureConnectIgnore` dropped: **accepted**, the
  moved helper's throw is still covered twice in `kanmerGit.test.ts` and the
  caller converts any throw to a note.

The `.gitignore` comment block, FRD-012 R1/R1c/R1e/R7 and `docs/manual/
connect.md` are all consistent with the code, and the R1c rationale ("a
teammate without Kanmer installed would otherwise inherit a server that cannot
start") is the honest replacement for the "hardcoded absolute paths" reason the
change removes.

## Findings

**F-001 (blocker)** — `apps/gui/src/main/connect.ts:131` /
`apps/gui/src/main/index.ts:1560` / `apps/gui/src/main/openaiTunnel.ts:421`.

`serverInvocation` is not only the project-registration factory. Its one other
production caller is the OpenAI secure-tunnel manager:

```
openAITunnel = new OpenAITunnelManager(
  app.getPath("userData"), undefined,
  (roots) => serverInvocation("claude", roots.boardRoot, roots.repoRoot, readSettings().kanmerBranch),
);
```

`OpenAITunnelManager.initialize` turns that invocation into the
`--mcp-command` string handed to `tunnel-client runtimes connect`
(`openaiTunnel.ts:421`, via `buildOpenAITunnelMcpCommand` at `:183`). Before
this commit it was `"C:/…/Kanmer.exe" "C:/…/kanmer-mcp.cjs" --root
"<board>" --repo-root "<repo>"` — self-pinning. After it, it is
`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& (Join-Path
$env:LOCALAPPDATA 'Kanmer/bin/kanmer-mcp.cmd')"` with no root of any kind.

FRD-026 **R3 (Canonical target)** says verbatim: "`runtimes connect` uses the
existing packaged Electron-as-Node stdio invocation **with the selected board
root and optional repository root**." This PR contradicts that requirement and
amends only FRD-012; FRD-026 is not in `refs`, not in the plan's governing-doc
list, and the tunnel is mentioned nowhere in `files.md` or the
post-implementation report. The plan lists `index.ts` under "Do not modify" and
`files.md` justifies it as "signature of `serverInvocation` is preserved so no
caller changes" — the signature is preserved, the contract is not, which is
precisely how this got through unnoticed.

Failure scenario: a user registers the OpenAI tunnel for project A and later
for project B. Per FRD-026 R4 the tunnel-client runtime is deliberately *not* a
GUI-owned child — closing the app or the project leaves it running, and it is
re-launched outside Kanmer. Its child MCP process therefore starts with a
working directory Kanmer does not control, and the rootless launcher resolves
the board by ADR-0012 cwd discovery: `discoverBoardRoot` walks up from that
directory and binds to the first `.kanmer` or `.worktrees/*/.kanmer` it meets —
project B's board, the reviewer's own repo, or nothing. That is a silent
cross-project board binding served over a public tunnel, which FRD-026 **R1
(Project isolation)** forbids ("The GUI must not combine boards behind one
profile"), and the doctor's `MCP_TARGET` check would still report pass because
it only inspects the exit code of `runtimes connect`. Secondarily, an
unpackaged/dev build can no longer initialise a tunnel at all (no launcher),
and `shellArg` (`openaiTunnel.ts:178`) rewrites the backslashes and re-quotes
the `-Command` payload for the tunnel client's own parser — round-tripping `&`,
`(`, `)` and the embedded single quotes through it is unverified.

No test covers this: `openaiTunnel.test.ts:71` and `:141` still exercise the
manager's default `() => ({ command: process.execPath, args: [] })` factory and
a hand-written Electron example, so the production wiring at `index.ts:1560` is
untested in both the old and the new shape.

The fix is small and inside this packet's own files: give the tunnel its own
root-pinned factory (or restore the deleted Electron invocation for that one
caller) and drop the now-dead `boardRoot`/`sourceRoot` parameters from
`serverInvocation` so the compiler names every remaining consumer; or, if the
operator prefers the portable target there too, amend FRD-026 R3/R1 explicitly
and prove the tunnel's MCP cwd. Either way it belongs on this PR, not a new
ticket — it is caused by this diff and fixed in files this plan already owns.

**F-002 (minor)** — `packages/core/src/staleness.ts:921` +
`apps/gui/src/main/connect.ts:131`, root-cause class "the board is not always
under the project".

`ensureBoardWorktree` adopts the board-branch worktree **at whatever path git
reports** (`apps/gui/src/main/kanmerGit.ts:547-548`), and `discover.ts:92`
states the same thing in a comment: "`.worktrees/kanmer` is a convention, not
an invariant". But `discoverBoardRoot` only probes `<level>/.kanmer` and
`<level>/.worktrees/*/.kanmer` and stops at the first `.git` **directory** — the
project root. So a user who ran `git worktree add C:/boards/proj kanmer-board`
has `ctx.boardRoot = C:/boards/proj`, and a Claude/OpenCode registration with
no `--root` finds no board at all where the pre-GUI-149 file worked. The same
user's hand-written repair (adding `--root C:/boards/proj` back) is now
reported `mcp-registration behind` with fix "reconnect this project in the
Kanmer app", and reconnecting deletes it — a repair loop. Codex has owned half
of this since GUI-100, so this is an existing class extended to two more hosts
rather than a new defect; the FRD-012 R1e/R7 amendment should state the
discoverability precondition it now depends on ("the board is reachable by
ADR-0012 discovery from the host's project directory") instead of implying
discovery always succeeds. Not a return-blocking defect on its own.

**F-003 (minor)** — `apps/gui/src/main/connect.ts:131-140`. `serverInvocation`
keeps `_boardRoot` and `_sourceRoot` and opens with `void id;` — three
parameters that no longer affect the result. Keeping the signature to avoid
caller churn is what allowed F-001's caller to change contract silently while
still type-checking and still reading, at the call site, as though it pinned a
board. Same root-cause class as F-001; fixing F-001 by narrowing the signature
disposes of this too.

**F-004 (minor)** — `packages/core/src/staleness.ts:763`. The loop
`for (const key of ["mcpServers", "mcp"])` `return`s on the **first** key that
holds a `kanmer` object, so a file carrying both a portable `mcpServers.kanmer`
and a legacy `mcp.kanmer` is judged only by `mcpServers` and reports clean.
Contrived today (each host owns one key), but the loop reads as "check both"
and does not; collecting from every key before deciding is a two-line change.

**F-005 (nit)** — `apps/gui/src/main/connect.test.ts:593`. The GUI-100
selection test's grok case (`grok.command === process.execPath`, `--root`
present, Electron env) was deleted rather than replaced. It is genuinely
unreachable now — grok's `register.kind` is `"none"`, so neither `connectAgent`
(which returns via `connectNativePlugin` first) nor `reconcileProviderRegistration`
(which bails on a missing `configPath`) ever calls `serverInvocation` for it —
but that reasoning lives only in this review. One asserted line, or a comment,
would pin it.

**F-006 (nit)** — `apps/gui/src/main/connect.ts:155-159`. `ensureConnectIgnore`
reports "added `.mcp.json` to .gitignore" whenever the rule was absent from the
file, including when the project already **tracks** `.mcp.json` — where the new
rule has no effect at all, because `.gitignore` does not apply to tracked
paths. A team that had committed its `.mcp.json` (which this very change makes
reasonable, since the file is now machine-portable) gets a note claiming an
outcome that did not happen. Saying "added … to .gitignore; run `git rm
--cached` if it is already tracked" would be accurate.

## Required checks

Not green at this head, independently of the findings above:
`kanmer-gate` **FAILURE** (completed 17:11:42Z) and `verify` **IN_PROGRESS** on
run 33783013596. `kanmer-gate` is expected to be red until a review attestation
exists on the pushed board, but it must be re-run and green before any merge
decision, and `verify` has no conclusion yet. `reviewDecision` is empty; there
are no reviews and no comments.

## Residual risk

F-002 through F-006 are recorded as residual risk for the implementer and do
not by themselves require a return. F-001 does. Real-host acceptance (scratch
repo → Connect ×3 → `git status` shows only `.gitignore`; `claude -p`
`get_status` → `rootSource: cwd-worktree`; hand-edited legacy `.mcp.json` →
`behind`) remains INCONCLUSIVE and owed at 0.4.1, which the checklist's
post-merge item and the post-implementation report both state honestly; item 2
above narrows *why* it cannot be closed from a dev machine (Claude Code's
per-project approval), which is useful evidence for whoever runs it.

This review writes no proof and records no merge SHA.
