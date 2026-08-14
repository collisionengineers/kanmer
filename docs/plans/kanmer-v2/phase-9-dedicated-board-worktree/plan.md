# Dedicated Kanmer Worktree and Automatic Git Sync

## Summary

Kanmer will separate the repository being worked on from the worktree containing its board:

- **Source root:** the normal repository/worktree where agents edit code, read `/docs`, and install project configuration.
- **Board root:** `<source-root>/.worktrees/kanmer`, checked out on the configured Kanmer branch and containing `.kanmer/`.
- **Default branch:** `kanmer-board`, configurable globally in the GUI.
- **Automatic sync:** off by default; when enabled, adjustable in whole one-minute increments.
- The GUI creates, locates, migrates, renames, commits, pulls, and pushes this branch.
- MCP read/write calls receive the board root, while agent execution and project configuration continue using the source root.

No core storage-format or MCP-tool changes are required.

## Files to change

### Git worktree management

#### 1. Add `apps/gui/src/main/kanmerGit.ts`

Implement a small Git adapter using `execFile`, without adding a Git library dependency:

- Resolve the source repository root with `git rev-parse --show-toplevel`.
- Use the stable worktree path `.worktrees/kanmer`; the path does not change when the configured branch is renamed.
- Parse `git worktree list --porcelain` to locate an existing checkout of the configured branch.
- Create a new orphan board branch or attach to an existing local/remote branch.
- Migrate an existing source-root `.kanmer/` only after successfully committing it to the board branch.
- Add `.kanmer/` and `.worktrees/` to the source repository's `.gitignore`.
- Ignore `.kanmer/data/activity.jsonl` on the board branch because it is derived data and would cause unnecessary append-only conflicts.
- Rename the board branch across configured projects.
- Perform one serialized Git sync per project.
- Return structured setup/sync status and command errors to the GUI.
- Never construct shell command strings from the configured branch name; pass arguments separately to `execFile`.
- Validate branch names with `git check-ref-format --branch`.

#### 2. Add `apps/gui/src/main/kanmerGit.test.ts`

Use temporary repositories and local bare remotes to test real Git behavior:

- First-time orphan branch creation.
- Opening an existing local branch.
- Creating a tracking worktree from an existing remote branch.
- Migration of an existing `.kanmer/`.
- Branch rename and remote replacement.
- Local-only, remote-only, and bidirectional sync.
- No-change sync.
- Rebase conflict abort and pause behavior.
- Rejection of invalid branch names.
- Confirmation that no branch other than the configured board branch is checked out, committed, rebased, or pushed.

### Settings persistence and UI contract

#### 3. Update `apps/gui/src/main/settings.ts`

Add global settings:

```ts
kanmerBranch: string;      // default "kanmer-board"
gitSyncMinutes: number;    // default 0; 0 = off
```

Add one setter that validates and persists both fields. Reading older `settings.json` files must supply defaults without requiring migration. Invalid intervals fall back to `0`; valid enabled intervals are positive integers.

#### 4. Update `apps/gui/src/shared/ipc.ts`

Add:

- `KanmerGitPreferences`.
- `KanmerGitStatus`.
- `setKanmerGitPreferences`.
- `getKanmerGitStatus(projectId)`.
- `syncKanmerNow(projectId)`.
- A main-to-renderer Git-status event.

Extend `OpenProjectResult` with `boardRoot`, while retaining `root` and `projectId` as the source repository root.

#### 5. Update `apps/gui/src/preload/index.ts`

Expose the new settings, status, manual-sync, and status-subscription IPC calls through `window.kanmer`.

#### 6. Update `apps/gui/src/preload/index.d.ts` only if required

No change is needed if the global declaration already derives the complete shape from `KanmerApi`. Otherwise update it to expose the new calls.

#### 7. Update `apps/gui/src/renderer/src/components/Settings.tsx`

Add a **Git** settings tab containing:

- “Kanmer branch” text field, defaulting to `kanmer-board`.
- “Automatic sync” control with `Off` or an integer number of minutes.
- Numeric input with `min=1`, `step=1` whenever enabled.
- “Sync now” button for the active project.
- Current board worktree path, last successful sync, and latest error.
- A confirmation before changing the branch for existing projects, stating that Kanmer will push the new branch and delete the old remote branch only after the new push succeeds.
- A paused/error state with a “Retry” action.

#### 8. Update `apps/gui/src/renderer/src/App.tsx`

- Load and retain the Git preferences with the existing app settings.
- Pass Git settings/status handlers into `Settings`.
- Subscribe to Git-status changes.
- Keep source-root tabs and names unchanged; do not display `.worktrees/kanmer` as a separate project.
- Refresh the board after an incoming Git sync changes files.

#### 9. Update `apps/gui/src/renderer/src/styles.css`

Add only the small layout rules required for the Git settings rows and sync-status display, reusing existing field, banner, button, and hint classes.

### Split source root from board root

#### 10. Update `apps/gui/src/main/index.ts`

Change `ProjectContext` to hold:

```ts
sourceRoot: string;
boardRoot: string;
store: KanmerStore; // bound to boardRoot
syncTimer?: NodeJS.Timeout;
syncPaused: boolean;
syncRunning: boolean;
syncStatus: KanmerGitStatus;
```

On project open:

1. Canonicalize the selected source repository.
2. Ensure or locate `.worktrees/kanmer` for the configured branch.
3. Bind `KanmerStore` and `watchKanmer` to the board root.
4. Keep `projectId`, recent projects, tabs, repo documents, and file pickers bound to the source root.
5. Start a timer only when `gitSyncMinutes > 0`.
6. Run at most one sync at a time per project.
7. Clear the timer when the project closes.
8. Reschedule all open projects immediately when the interval changes.
9. Apply a branch-name change to every known recent project immediately when accessible, and on next open otherwise.
10. On sync conflict or failure, abort any active rebase, retain local commits, pause that project's timer, and publish the error. Manual Retry resumes it.

Correct existing operations that currently derive repository behavior from `store.paths.projectRoot`:

- Governing-document open/read/pick operations use `sourceRoot`.
- Board CRUD and watcher operations use `boardRoot`.
- Connect and dispatch receive both roots.
- Notifications and tab identity remain keyed by `sourceRoot`.

#### 11. Update `apps/gui/src/main/connect.ts`

Change connection setup to accept both roots:

```ts
connectAgent(provider, sourceRoot, boardRoot)
```

- Install AGENTS instructions, copied skills, and project provider configuration under `sourceRoot`.
- Generate the MCP invocation with `--root <boardRoot>`.
- Continue deriving the Codex server name from `sourceRoot`, so the stable MCP registration name does not become `kanmer-kanmer`.
- Disconnect and skills-update operations continue acting on `sourceRoot`.

#### 12. Update `apps/gui/src/main/dispatch.ts` and `apps/gui/src/main/dispatch.test.ts`

- Pass `sourceRoot` separately from the board-bound `KanmerStore`.
- Spawn the agent with `cwd: sourceRoot`.
- Continue reading and updating tickets through the board-root store.
- Verify in tests that dispatch starts in the source repository while ticket state is read from the board worktree.

### Documentation

#### 13. Update `README.md`

Document:

- Source root versus board root.
- Default `.worktrees/kanmer` location.
- Configurable branch and sync interval.
- Initial migration behavior.
- Cross-machine setup.
- Paused-sync conflict recovery.
- The exact manual commands below as a recovery/reference procedure.

#### 14. Update `AGENTS.md`

Replace the statement that every code worktree owns `.kanmer/` with the canonical-board-worktree model. Add the Git settings and sync implementation to the architecture, commands, and verification sections.

#### 15. Update `apps/gui/src/main/agentsBlock.ts` and `scripts/verify-agents-block.mjs`

Keep agent instructions clear that Kanmer tools are already rooted at the canonical board. Agents must still pass their actual code branch and code worktree to `take_ticket`; they must not manipulate the board branch themselves.

#### 16. Update `plugins/kanmer/skills/kanmer-setup/SKILL.md`

Make GUI-managed board-worktree setup the normal path. Retain the manual commands as recovery instructions. No ticket tool signatures change, so the tool reference and standalone MCP bundle do not change.

## Exact Git operations

### First-time setup when no board branch exists

The GUI performs the equivalent of:

```powershell
$KanmerRepoRoot = git rev-parse --show-toplevel
$KanmerBranch = "kanmer-board"
$KanmerWorktree = Join-Path $KanmerRepoRoot ".worktrees\kanmer"

git check-ref-format --branch $KanmerBranch
git worktree add --orphan -b $KanmerBranch $KanmerWorktree
Copy-Item -LiteralPath (Join-Path $KanmerRepoRoot ".kanmer") `
  -Destination (Join-Path $KanmerWorktree ".kanmer") -Recurse

git -C $KanmerWorktree add -- .kanmer
git -C $KanmerWorktree commit -m "chore(kanmer): create shared board"
git -C $KanmerWorktree push -u origin "HEAD:refs/heads/$KanmerBranch"
```

Only after the board commit and push succeed, the GUI switches its store to the board worktree and performs the equivalent source-branch cleanup:

```powershell
git -C $KanmerRepoRoot rm -r --ignore-unmatch -- .kanmer
# Ensure these exact entries exist once in the source .gitignore:
# .kanmer/
# .worktrees/
git -C $KanmerRepoRoot add -- .gitignore
git -C $KanmerRepoRoot status --short
```

The GUI leaves the source-branch cleanup staged and visible for the user to commit through their normal code workflow. It does not commit or push the development branch automatically.

The board worktree's own `.gitignore` contains:

```gitignore
.kanmer/data/activity.jsonl
```

### Setup when the remote board branch already exists

```powershell
$KanmerRepoRoot = git rev-parse --show-toplevel
$KanmerBranch = "kanmer-board"
$KanmerWorktree = Join-Path $KanmerRepoRoot ".worktrees\kanmer"

git -C $KanmerRepoRoot fetch origin `
  "+refs/heads/$KanmerBranch:refs/remotes/origin/$KanmerBranch"
git -C $KanmerRepoRoot worktree add --track -b $KanmerBranch `
  $KanmerWorktree "origin/$KanmerBranch"
```

If the local branch already exists but has no worktree:

```powershell
git -C $KanmerRepoRoot worktree add $KanmerWorktree $KanmerBranch
```

If `git worktree list --porcelain` shows that the branch is already checked out elsewhere, the GUI uses that existing path instead of creating another checkout.

### Automatic sync cycle

For the configured board worktree and that branch only:

```powershell
git -C $KanmerWorktree symbolic-ref --short HEAD
git -C $KanmerWorktree add -- .kanmer .gitignore
git -C $KanmerWorktree diff --cached --quiet -- .kanmer .gitignore
git -C $KanmerWorktree commit -m "chore(kanmer): sync board <UTC timestamp>"
git -C $KanmerWorktree ls-remote --exit-code --heads origin `
  "refs/heads/$KanmerBranch"
git -C $KanmerWorktree fetch origin `
  "+refs/heads/$KanmerBranch:refs/remotes/origin/$KanmerBranch"
git -C $KanmerWorktree rebase "origin/$KanmerBranch"
git -C $KanmerWorktree push -u origin `
  "HEAD:refs/heads/$KanmerBranch"
```

Implementation rules:

- Skip `commit` when the staged diff is empty.
- Skip fetch/rebase when the remote branch does not exist yet.
- Push creates the remote branch on its first cycle.
- Never run `git add .`; scope staging to `.kanmer` and the board worktree's `.gitignore`.
- Never use `--force`.
- If rebase fails, immediately run:

```powershell
git -C $KanmerWorktree rebase --abort
```

Then pause automatic sync for that project and preserve the local board commit.

### Changing the branch name for all projects

For each open or recent Git project, after validating that the new local and remote branch names do not already exist:

```powershell
$OldKanmerBranch = "kanmer-board"
$NewKanmerBranch = "my-kanmer-board"

git -C $KanmerWorktree status --porcelain
git -C $KanmerWorktree branch -m $OldKanmerBranch $NewKanmerBranch
git -C $KanmerWorktree push -u origin `
  "HEAD:refs/heads/$NewKanmerBranch"
git -C $KanmerWorktree push origin `
  --delete $OldKanmerBranch
```

Rules:

- Sync pending board changes before renaming.
- Refuse the rename if the worktree is conflicted, rebasing, or the destination branch exists.
- Push the new branch before deleting the old remote branch.
- If the new push fails, retain the old local branch name and remote branch.
- Keep `.worktrees/kanmer` unchanged, so existing MCP registrations remain valid.
- Projects unavailable when the setting changes are migrated the next time they open.

### Cross-machine recovery/setup

```powershell
git clone <repository-url> <repository-folder>
Set-Location <repository-folder>

$KanmerBranch = "kanmer-board"
$KanmerWorktree = Join-Path (Get-Location) ".worktrees\kanmer"

git fetch origin `
  "+refs/heads/$KanmerBranch:refs/remotes/origin/$KanmerBranch"
git worktree add --track -b $KanmerBranch `
  $KanmerWorktree "origin/$KanmerBranch"
```

Opening the source repository in Kanmer then detects and uses this worktree automatically.

## Settings behavior

- `kanmerBranch` defaults to `kanmer-board`.
- The branch setting is global and applies to all projects.
- `gitSyncMinutes` defaults to `0`, meaning off.
- Enabled values are integers `>= 1`; the GUI increments or decrements by one minute.
- Saving a new interval immediately reschedules every open project.
- Saving a new branch name starts the confirmed rename process across known projects.
- A sync runs after the configured interval and through **Sync now**; it does not run on every ticket write.
- Sync errors never block local ticket writes.
- A conflict or Git/authentication failure pauses only the affected project until Retry or application restart.
- Only the dedicated Kanmer branch is committed, fetched, rebased, or pushed automatically.
- Non-Git folders retain the current colocated `.kanmer/` behavior and show Git sync as unavailable.

## Verification

1. Run the new temporary-repository Git tests and existing dispatch/provider tests.
2. Verify a project with tracked `.kanmer/` migrates without losing ticket or document bytes.
3. Open two code worktrees and confirm both MCP registrations target the same `.worktrees/kanmer` board root.
4. Confirm ticket writes dirty only the board worktree.
5. Confirm repo documents, copied skills, AGENTS instructions, and dispatched agents still use the source root.
6. Confirm one-minute sync commits and pushes only the configured board branch.
7. Confirm remote board changes appear through the existing watcher after sync.
8. Force a same-ticket conflict; confirm rebase aborts, local commits remain, and the project pauses with a visible error.
9. Rename the branch; confirm the worktree path and MCP configuration remain valid and the old remote branch is deleted only after the new branch is pushed.
10. Run:

```powershell
npm test
npm run typecheck -w @kanmer/gui
npm run build -w @kanmer/gui
npm run plugin:check
node scripts/verify-agents-block.mjs
```

11. Run the documented GUI boot smoke with a fresh `--user-data-dir`.

## Assumptions and defaults

- Kanmer state remains Git-backed and available across machines.
- One canonical board branch exists per repository.
- The GUI manages the board worktree, but source-branch cleanup remains an explicit visible change for the user to commit.
- The branch name is a global preference and changing it applies to all known projects.
- The automatic sync interval is global, is off by default, and has one-minute resolution.
- Concurrent edits to the same ticket may still require manual conflict resolution; unrelated ticket files normally merge independently.
