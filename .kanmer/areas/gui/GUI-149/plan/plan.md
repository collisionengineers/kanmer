# Plan — GUI-149: one portable launcher for every project registration, auto-gitignored

## Objective
Claude Code and OpenCode project registrations stop embedding this machine's paths and use the installer-owned launcher Codex already uses; the staleness read reports the old absolute shape as `behind`; Connect appends what it writes to the target project's `.gitignore`. Codex, Grok and Antigravity behaviour is otherwise unchanged.

## Starting state
Verified against `origin/main` `cd5b6b6b`:
- `installedElectronInvocation()` (`apps/gui/src/main/connect.ts:114-137`) returns `{ command: process.execPath, args: [<abs script>, "--root", boardRoot, ("--repo-root", sourceRoot)], env: { ELECTRON_RUN_AS_NODE, KANMER_BOARD_BRANCH } }`; `serverInvocation()` (`:140-150`) uses it for every id except `codex`.
- `codexPortableInvocation()` (`providers.ts:53-59`) and `CODEX_PORTABLE_COMMAND/ARGS` (`packages/core/src/staleness.ts:34-35`) are the portable contract; `probeCodexLauncher()` runs `--probe` before Codex writes (`connect.ts:1340-1343`).
- `registrationRows()` (`staleness.ts:837-874`) flags `--root` mismatches and, Windows + codex only, `isCurrentCodexRegistration() === false`. A registration without `--root` is by design not stale (`:833-835`).
- `ensureIgnore()` / `ignoreEntriesToAppend()` (`kanmerGit.ts:360-404`) are module-private and used for `.kanmer/`, `.worktrees/`.
- Board discovery from cwd finds `<project>/.worktrees/kanmer` (`discover.ts:105`, `cwd-worktree`); the server derives repo root without `--repo-root` (`mcp-server/src/index.ts:190`). Claude Code spawns project `.mcp.json` servers with cwd = project dir (docs). `claude` on PATH is `claude.exe`; Connect uses `execFileAsync` without a shell (`connect.ts:962`).
- Live evidence: this repo's `.mcp.json` carries the absolute `Kanmer.exe`, `--root`, `--repo-root`; `.codex/config.toml` carries none. `git check-ignore` hits only because this repo's own `.gitignore` lists the paths.

## Governing docs
- **FRD-012 R1 / R1e** — Amends (operator-authorised in the approved session plan): the R1e portable Windows contract becomes the canonical project entry for Claude Code and OpenCode too. Registration files and ownership (R1a) are unchanged.
- **FRD-012 R1c** — Meets and strengthens: registration files stay gitignored, now by Connect itself rather than by convention.
- **FRD-012 R1d** — Meets: only the installer-owned launcher is named; no install dir serialised.
- **FRD-012 R4** — Meets: disconnect still reverses the registration; the `.gitignore` lines are not "what connect wrote" in the ownership sense and are left.
- **FRD-012 R7** — Amends its last sentence: no project registration retains an absolute/root-pinned contract.
- **ADR-0012** (discovery) — Meets: relies on cwd discovery exactly as Codex does.

## Required changes
1. Core: `PORTABLE_LAUNCHER_COMMAND/ARGS` (aliases `CODEX_PORTABLE_*` kept for one release); `isLegacyLauncherDescriptor(text, format)` returning true when Kanmer's entry names `Kanmer.exe`, `kanmer-mcp.cjs`, `--root`, `--repo-root` or `ELECTRON_RUN_AS_NODE`, or (TOML) fails `isCurrentCodexRegistration`; `registrationRows()` emits `behind` for it on Windows for all three registration files.
2. GUI providers: `portableLauncherInvocation(boardBranch?)` (alias `codexPortableInvocation`); `connectIgnoreEntries(provider): string[]` derived from `register.configPath` and `install.skillsDir` (`/`-suffixed).
3. GUI connect: `serverInvocation()` → portable for `codex | claude | opencode`; delete `installedElectronInvocation`; `probeLauncher()` (renamed from `probeCodexLauncher`, wording generalised) gates all three; `ensureConnectIgnore(provider, projectRoot)` best-effort after registration in `connectAgent` and `reconcileProviderRegistration`, only when `<projectRoot>/.git` exists; Claude output gains the approval note.
4. Shared `gitIgnore.ts` with the moved helper; `kanmerGit.ts` imports it.
5. Tests and docs per `files.md`.

## Expected files
`packages/core/src/staleness.ts`, `packages/core/src/staleness.test.ts`, `apps/gui/src/main/providers.ts`, `apps/gui/src/main/connect.ts`, `apps/gui/src/main/gitIgnore.ts`, `apps/gui/src/main/kanmerGit.ts`, `apps/gui/src/main/providers.test.ts`, `apps/gui/src/main/connect.test.ts`, `docs/functional/frd/FRD-012-connect.md`, `AGENTS.md`, `.gitignore`, `docs/manual/connect.md`.

## Do not modify
`plugins/**`, `.claude-plugin/**`, `.agents/**`, native-plugin code paths for grok/antigravity, `apps/gui/src/main/index.ts`, installer scripts.

## Constraints
- No absolute-path fallback anywhere (R1e). Dev/unpackaged builds without the shim are refused with the existing repair text, as Codex is today.
- `.gitignore` write is best-effort: symlink refusal or a read error is a note in the Connect output, never `ok:false`.
- Never expand the LOCALAPPDATA token in Node; the destination host expands it.
- Windows-only judgement in staleness stays behind `process.platform === "win32"`.

## Ordered steps

### Step 1 — Portable contract in core and providers
- Files: `packages/core/src/staleness.ts`, `apps/gui/src/main/providers.ts`, `apps/gui/src/main/providers.test.ts`
- Change: rename constants with aliases; add `portableLauncherInvocation`; add `connectIgnoreEntries`.
- Tests: the three ids' invocations contain none of `Users|Kanmer\.exe|--root|--repo-root|cwd|ELECTRON_RUN_AS_NODE`; `connectIgnoreEntries` yields `.mcp.json`, `.codex/config.toml`, `opencode.json` + `.opencode/skills/`, nothing for grok/antigravity.
- Done when: providers tests green.

### Step 2 — connect.ts uses it for all three and probes first
- Files: `apps/gui/src/main/connect.ts`, `apps/gui/src/main/connect.test.ts`
- Change: `serverInvocation` switch; remove `installedElectronInvocation`; probe for the three; Claude approval note.
- Tests: `serverInvocation("claude"|"opencode")` equals `serverInvocation("codex")` apart from env; probe failure returns `ok:false` for claude and opencode with no file written; existing GUI-100 tests still pass.
- Done when: connect tests green.

### Step 3 — Auto-gitignore
- Files: `apps/gui/src/main/gitIgnore.ts`, `apps/gui/src/main/kanmerGit.ts`, `apps/gui/src/main/connect.ts`, `apps/gui/src/main/connect.test.ts`
- Change: move helper; `ensureConnectIgnore` called after registration and in reconcile.
- Tests: fresh temp git project gets rules once; second connect appends nothing; project without `.git` untouched.
- Done when: tests green; `kanmerGit.test.ts` unchanged and green.

### Step 4 — Staleness detection of legacy descriptors
- Files: `packages/core/src/staleness.ts`, `packages/core/src/staleness.test.ts`
- Change: `isLegacyLauncherDescriptor`; `registrationRows` wiring for `.mcp.json` and `opencode.json`.
- Tests: legacy `.mcp.json` fixture → `behind`; portable JSON → no row; codex behaviour unchanged.
- Done when: core tests green.

### Step 5 — Docs
- Files: `docs/functional/frd/FRD-012-connect.md`, `AGENTS.md`, `.gitignore`, `docs/manual/connect.md`
- Change: R1/R1c/R1e/R7 amendments; §8 gotcha; comment block; manual rows.
- Done when: `npm run verify` green.

## Acceptance checks
- `npm run verify` exit 0.
- Real host after install of a build containing this commit (owed at 0.4.1 acceptance if no build is installed yet): scratch git repo + board → Connect claude/codex/opencode → `git status` shows only `.gitignore`; `claude mcp list` Connected; `claude -p` get_status → `rootSource: cwd-worktree`; `get_status.repo.stale` has no `mcp-registration` row; hand-edited legacy `.mcp.json` → `behind`.

## Commands
`npm run verify`; `npm test -w @kanmer/gui -- connect.test.ts providers.test.ts`; `npm test -w @kanmer/core -- staleness.test.ts`.

## Failure and deviation rules
Stop and report if Claude Code refuses the `powershell.exe` command form in `.mcp.json` on a real host, if OpenCode's `command` array cannot start PowerShell, or if any test requires mutating the developer's real `~/.claude` state.

## Stop condition
Stop at a green PR meeting this plan's checklist with the post-implementation report written. Do not merge; do not start GUI-150 inside this ticket.
