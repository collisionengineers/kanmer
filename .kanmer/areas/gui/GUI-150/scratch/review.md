---
kind: review-attestation
pr: "317"
head_sha: "26c5337721534cac6defcc8d652734ef9498dc73"
verdict: pass
reviewer: "independent-review-agent (claude-opus-5, distinct role from implementer claude-code)"
independent: true
plan_hash: "ca13928c4fc8b714"
ticket_updated: "2026-09-04T00:35:38.637Z"
board_sha: "ccf8b459f874744da7e9aa83a1c80367277ecc13"
expected_reviewers:
  - "independent-review-agent (claude-opus-5, distinct role from implementer claude-code)"
threads_snapshot: []
findings:
  - id: F-001
    severity: minor
    summary: "parseJsonPluginEntries slices the host output from indexOf(\"[\") to lastIndexOf(\"]\"), and the caller feeds it stdout + newline + stderr. Any bracketed text outside the array — a leading `[WARN] …` line, or Node's own `(node:1) [DEP0040] DeprecationWarning` on stderr — makes JSON.parse throw, the text fallback find no blocks, and a healthy host parse as null, so Connect reports 'no Kanmer plugin at all' and offers a repair that cannot fix it. Verified by probe: leading and trailing bracketed noise both yield null."
    disposition: accepted-risk
    reason: "The failure direction is correct and is the property this ticket exists to protect: it fails closed and loud with the pasteable repair, never a false green tick, and skillsStatus soft-fails to the pre-existing 'unknown' rendering. `claude plugin list --json` is not observed to write to stderr, and the text transcript fallback still covers a host without --json. The robust form (scan stdout alone, or bracket-match rather than slice) is a one-line change if a real host is ever seen emitting bracketed stderr; returning the ticket for a hypothetical is the churn SKILL-039 rules out. Residual risk recorded."
  - id: F-002
    severity: minor
    summary: "AGENTS.md section 8 gotcha 24 still reads 'Connect then requires `claude plugin list` to report the bundled plugin.json version' and 'the reported version is the evidence'. This PR changes that command to `claude plugin list --json` and makes the version no longer sufficient, but does not amend the gotcha. Conduct rule 24 ('A PR that changes commands or conventions updates AGENTS.md in the same PR') is on point, and GUI-147 — the direct predecessor by the same mechanism — amended AGENTS.md and FRD-012 together (7a206202)."
    disposition: accepted-risk
    reason: "The authoritative record is correct: FRD-012 R2's Claude Code bullet carries a complete, accurate 'Amended (GUI-150)' sentence naming the --json read-back, the errors/enabled failures, the quoted host words, hostError, and the retained text fallback. AGENTS.md section 8 is a hand-written digest of that governing doc, not a contract any code reads; no gate, test or runtime depends on it, and the plan's approved Governing-docs section named FRD-012 only, so the packet did not carry this obligation. Carried as residual risk into the 0.4.1 doc pass rather than spending the single remediation return on one digest sentence; posted publicly on the PR."
  - id: F-003
    severity: note
    summary: "apps/gui/src/main/providers.test.ts is in the plan's Expected-files table and is ordered step 1 ('providers.test.ts cases: JSON healthy / errors / disabled / absent / two scopes; text fallback'), but the PR leaves it unmodified and puts those cases in connect.test.ts. The post-implementation report's Deviations section does not record the omission."
    disposition: rejected-with-reason
    reason: "Not a coverage gap: every listed case exists and exercises the same contract surface — the tests call claudeInstall().installedVersion and assert both command === 'claude plugin list --json' and parse() over JSON (healthy, errors, disabled, absent, other plugin, two scopes, missing enabled) and the text fallback (Status: disabled, Error:). providers.test.ts contains no reference to the parser or the check command at all, so there was nothing there to update. Which file holds a test is not a plan obligation; the unrecorded deviation is a reporting nit, not a defect."
  - id: F-004
    severity: note
    summary: "parseJsonPluginEntries coerces errors entries with String(error), so a host that emitted an object would put [object Object] into the Connect failure text and the Settings hint. Confirmed by probe."
    disposition: accepted-risk
    reason: "The coercion keeps the array a string[] and keeps the failure loud and correctly directed; only the wording degrades, and the observed host (claude 2.1.259) emits strings. Not worth a schema guard on a message field."
  - id: F-005
    severity: note
    summary: "skillsStatus computes hostError = state.errors[0] ?? 'plugin disabled'. The ?? does not catch an empty string, so a host reporting errors: [''] would give hostError: '' — falsy, so Settings renders no load-error hint, while updateAvailable is true and the version hint is suppressed because the versions match: an 'Update skills' button with no stated reason."
    disposition: accepted-risk
    reason: "Unreachable with any observed host output (an empty error string), cosmetic when reached, and it still errs towards offering the repair rather than hiding the fault. pluginLoadProblem is unaffected, so Connect itself still fails correctly in that case."
  - id: F-006
    severity: note
    summary: "packages/ui/src/demo.tsx is modified although the plan's Do-not-modify list says packages/**."
    disposition: rejected-with-reason
    reason: "One line (hostError: null in a getSkillsStatus literal), forced by the type: demo.tsx types its client against apps/gui/src/shared/ipc.js KanmerApi, so the literal cannot omit the new required field and @kanmer/ui typecheck fails without it. The author recorded it as a deviation with that reason. No behaviour, no product surface."
---

# Review — GUI-150 (PR #317, head `26c53377`), round 0, consolidated

Independent review. I am not the author; the implementer is `claude-code` working
`.worktrees/gui-150`, and I reviewed from a disposable detached checkout at
`.worktrees/gui-150-review`, which has been removed.

## What the change does

GUI-147 made Connect read the plugin version back from the host and fail on a
mismatch. On 2026-09-03 that check would have passed a plugin the host could not
load: `claude plugin list --json` reported `kanmer@kanmer` at the bundled
version, `enabled: true`, and
`errors: ["Marketplace kanmer failed to load: cache-miss"]` — the exact state
GUI-147 exists to end. This PR closes that hole:

- `providers.ts`: `MarketplaceVersionCheck.parse` now returns
  `MarketplacePluginState | null` (`version`, `scope`, `enabled`, `errors`).
  `parseMarketplacePluginState` reads the `--json` array first and falls back to
  the text transcript, which gains `Status:` and `Error:` lines. Claude's check
  command becomes `claude plugin list --json`.
- `connect.ts`: `verifyInstalledMarketplaceVersion` keeps the unreadable, absent
  and version-mismatch failures in that order, then adds the load-error/disabled
  failure, quoting the host's own words and offering the same uninstall+install
  repair. `skillsStatus("claude")` carries `hostError` and sets `updateAvailable`.
- `ipc.ts` mirrors `SkillsStatus.hostError`; `packages/ui/src/demo.tsx` follows
  the type.
- `Settings.tsx` shows `· plugin failed to load: <error>`, suppresses the version
  hint when the versions agree, and the "Update skills" title names the
  re-install.
- FRD-012 R2's Claude Code bullet carries the `Amended (GUI-150)` sentence. (The
  plan called this "R1"; the GUI-147 amendment it extends lives in the R2 bullet,
  so the placement is right and the plan's label was loose.)

## Acceptance checks

| Plan acceptance check | Result |
|---|---|
| JSON with `errors: ["…cache-miss"]` at the bundled version → `ok:false`, repair command, output contains `cache-miss` | Met — connect.test.ts "fails Connect with the repair when the host reports the plugin failed to load, even at the bundled version"; asserts the exact repair string, `cache-miss`, and `v<bundled>` |
| `enabled:false` → `ok:false` | Met — "fails Connect when the host reports the plugin disabled at the bundled version" |
| Healthy JSON → `ok:true` with `host reports plugin v<bundled>` | Met — "reports success when the host's --json report is healthy at the bundled version" |
| `skillsStatus("claude")` `hostError` set + `updateAvailable` true when failed; null/false when healthy | Met — "surfaces the host's load error in the skills staleness read and offers the re-install", covering failed, disabled and healthy |
| GUI vitest and typecheck green | Reproduced independently, below |

## Independent verification

Detached checkout at `origin/GUI-150-claude-plugin-load-check` (`26c53377`),
`npm ci` (exit 0), `npm run build -w @kanmer/core` (exit 0, required before
vitest can resolve `@kanmer/core`):

| Command | cwd | Exit | Result |
|---|---|---|---|
| `npx vitest run src/main/connect.test.ts src/main/providers.test.ts` | `apps/gui` | 0 | 2 files, **134 passed** (connect 64, providers 70) |
| `npm run typecheck` | repo root | 0 | clean across core, mcp-server, ui, gui (node + web projects) |

I did not run `npm run verify` or the GUI build (another process may be building
on this host); the hosted rail is the evidence — `verify` is SUCCESS at this exact
head.

## Scrutiny beyond the tests

Probed the parser directly in the review checkout (temporary test file, removed):

- **Object-shaped `--json` document** (`{"plugins":[…]}`): parses correctly — the
  slice happens to land on the inner array.
- **Leading / trailing bracketed noise**: null, i.e. a loud "no plugin at all"
  failure. See F-001.
- **Non-string `errors` entries**: coerced. See F-004.
- **A valid JSON array without `kanmer@kanmer`**: null, and it does *not* fall
  through to the text parser — correct, because the `??` only fires on a non-array
  document, and an empty match set is a genuine "absent".
- **Scope selection**: `user` wins over `local` regardless of array order (tested
  by the author); a single non-user entry is still returned as `candidates[0]`,
  which is GUI-147's pre-existing `scoped ?? named[0]` rule carried forward
  unchanged, not a new behaviour.

Checks the brief asked for specifically:

- **`updateAvailable` cannot leak "Update skills" to a project-scope host.**
  `hostError` is assigned only inside the `install.kind === "marketplace"` branch;
  the `!provider` early return, the `kind === "plugin"` return and the copy-skills
  return all take `hostError: null` from `base`, and the copy-skills
  `updateAvailable` still reads `isNewerVersion(...)` alone.
- **The version hint hides correctly.** It now requires
  `installedVersion !== bundledVersion`, so a load-failed plugin at the right
  version shows the error hint alone, with no `v0.4.1 → 0.4.1`. A `vnull` hint is
  impossible: `hostError` is non-null only when the state is non-null, and the
  state always carries a `string` version.
- **The "Update skills" button's promise is kept.** `updateSkills` →
  `installSkills` re-stages the marketplace root and, for an already-installed
  plugin, emits `marketplace update` / `remove`+`add` then
  `uninstall … && install …` — so the offered repair really is a re-install, not
  `claude plugin install`'s no-op.
- **No test runs a real `claude` command (gotcha 24).** The three new
  `connectAgent` cases each stub `hostVersionRunner`, `claudePluginStateDir` and
  `vi.stubEnv("LOCALAPPDATA", <temp>)`, and run through `useSyntheticClaude` with
  `noopCommand`. The `skillsStatus` cases stub `hostVersionRunner`; that path runs
  no mutating command and reads no `LOCALAPPDATA`. The existing "codex must not be
  asked" guard still throws if the wrong provider is queried.
- **Scope of the diff.** `plugins/**` and `packages/core/**` are untouched; the
  bundle is unchanged; the only `packages/` file is the one-line `@kanmer/ui` demo
  literal (F-006). Renderer conventions hold: `Settings.tsx` takes `SkillsStatus`
  as a type from `shared/ipc.ts` and adds no `@kanmer/core` runtime import.

## Threads

No review threads, reviews or comments exist on this head — confirmed through
both `gh pr view --json reviews,comments` and the GraphQL `reviewThreads`
surface, which returns an empty node list. `threads_snapshot` is therefore
truthfully empty. The `chatgpt-codex-connector` bot has not posted and is never a
gate.

## Checks

Actions run `33820724396`: `verify` SUCCESS (job 100865673086), `kanmer-gate`
FAILURE (job 100865671651) for the missing review record only, `regate` SKIPPED.
`kanmer-gate` is re-run by `workflow_dispatch` after this attestation is on the
pushed board.

## Residual risk

F-001 (bracketed stderr can turn a healthy host into a loud "no plugin at all")
and F-002 (AGENTS.md gotcha 24 still names `claude plugin list` and the
version-only rule) are accepted, recorded here and posted on the PR. F-004 and
F-005 are cosmetic edges that cannot produce a false green.

## Verdict

**pass.** The change is bounded to its packet, the defect it names is closed at
the exact place it was open, the failure it adds is loud and quotes the host, the
Settings surface can no longer look healthy over `cache-miss`, and no finding of
any severity is left open.
