# Outstanding ultrareview remediation after `d85f238`

**Reviewed head:** `d85f2387d3979f15b0c83c84301780c80c8fa28c`

**Purpose:** exact remaining work against the remediation plans in this folder.

**Boundary:** items 1–3 are still-open product defects. Items 4–9 are verification
or completeness gaps in fixes already carried by PR #13.

The PR named on each item is the PR that owns the affected phase. Because this is
a stacked chain, changing an earlier PR requires rebasing and pushing every
descendant through PR #13. Do not put an earlier-phase correction only on PR #13
and then describe its owning PR as independently fixed.

1. **Make background dispatch launch and terminate correctly on every supported platform — fix PR #10, then restack PRs #11, #12 and #13.**

   **Files:**

   - `apps/gui/package.json`
   - `package-lock.json`
   - `apps/gui/src/main/dispatch.ts`
   - `apps/gui/src/main/dispatch.test.ts`

   **Changes:**

   1. Add `cross-spawn` as a bundled GUI build dependency and its TypeScript
      declarations. This resolves npm `.cmd` shims without sending the prompt
      through an ambient shell.
   2. Replace Node's raw `spawn` default with `cross-spawn`, retaining the
      injectable test seam.
   3. Set `detached: process.platform !== "win32"` so the POSIX child is a
      process-group leader and `process.kill(-pid)` actually targets its tree.
   4. Introduce one idempotent `finishStartFailure` path for an asynchronous
      child `error`: clear the timer, close the log, remove both active indexes,
      set `failed`, emit a terminal status and prevent the later `close` handler
      from appending a second summary.
   5. Add platform-option, synchronous-error and asynchronous-error tests. Add a
      packaged Windows smoke using the real `codex.cmd`/equivalent shim and a
      POSIX smoke with a child that creates a grandchild.

   **Exact diff shape:**

   ```diff
   --- a/apps/gui/package.json
   +++ b/apps/gui/package.json
   @@
     "devDependencies": {
   +   "@types/cross-spawn": "^6.0.6",
       "@kanmer/core": "*",
   +   "cross-spawn": "^7.0.6",
   ```

   ```diff
   --- a/apps/gui/src/main/dispatch.ts
   +++ b/apps/gui/src/main/dispatch.ts
   @@
   -import { exec, spawn, type ChildProcess } from "node:child_process";
   +import { exec, type ChildProcess, type SpawnOptions } from "node:child_process";
   +import crossSpawn from "cross-spawn";
   @@
   -let spawnFn: typeof spawn = spawn;
   -export function __setSpawnForTests(fn: typeof spawn | null): void {
   -  spawnFn = fn ?? spawn;
   +type SpawnFn = (command: string, args: readonly string[], options: SpawnOptions) => ChildProcess;
   +let spawnFn: SpawnFn = crossSpawn;
   +export function __setSpawnForTests(fn: SpawnFn | null): void {
   +  spawnFn = fn ?? crossSpawn;
      }
   @@
   -proc = spawnFn(provider.dispatchCli, args, { cwd: root, env: process.env, windowsHide: true });
   +proc = spawnFn(provider.dispatchCli, args, {
   +  cwd: root,
   +  env: process.env,
   +  windowsHide: true,
   +  detached: process.platform !== "win32",
   +});
   @@
   -proc.on("error", (err) => onData(Buffer.from(`\n[dispatch error] ${err.message}\n`)));
   +let terminal = false;
   +const removeIndexes = () => {
   +  active.delete(dispatchId);
   +  projectDispatches.delete(ticketId);
   +  if (projectDispatches.size === 0) activeByProjectTicket.delete(projectId);
   +};
   +proc.once("error", (err) => {
   +  if (terminal) return;
   +  terminal = true;
   +  if (handle.timer) clearTimeout(handle.timer);
   +  onData(Buffer.from(`\n[dispatch error] ${err.message}\n`));
   +  status.state = "failed";
   +  status.exitCode = null;
   +  removeIndexes();
   +  logStream.end();
   +  emit({ ...status, tail: tail.slice(-50) });
   +});
   @@
     proc.on("close", (code) => {
   +   if (terminal) return;
   +   terminal = true;
       if (handle.timer) clearTimeout(handle.timer);
       logStream.end();
   @@
   -   active.delete(dispatchId);
   -   projectDispatches.delete(ticketId);
   -   if (projectDispatches.size === 0) activeByProjectTicket.delete(projectId);
   +   removeIndexes();
   ```

   **Proof:** GUI typecheck/build; dispatch tests; real Windows shim exits and
   writes one summary; POSIX cancel/timeout/app-quit terminate the grandchild;
   start error leaves neither active index populated.

2. **Replace hardcoded toast/document path inference with one v1/v2 classifier — fix PR #12, then restack PR #13.**

   **Files:**

   - `apps/gui/src/renderer/src/lib/kanmerPath.ts` (new)
   - `apps/gui/src/renderer/src/lib/kanmerPath.test.ts` (new)
   - `apps/gui/src/main/index.ts`
   - `apps/gui/src/renderer/src/App.tsx`

   **Changes:**

   1. Add a DOM/Node-independent classifier accepting a path string and returning
      `{key, kind}` for board, v1 item, v2 item or v2 document.
   2. Recognize v1 `tickets|plans|research/<id>.md` by filename.
   3. Recognize v2 `areas/<area>/<ticket>/<file>.md`; treat `<ticket>.md` as the
      item and every other Markdown filename—including configurable docs and
      `scratch-*`—as a document attributed to the ticket.
   4. Replace `toastKey` with the classifier and use the same result in renderer
      patch/unlink handling. Do not keep two heuristics.
   5. Add Windows/POSIX table tests for all layouts, malformed depths, every new
      default doc and `scratch-dispatch.md`.

   **Exact diff shape:**

   ```diff
   +// apps/gui/src/renderer/src/lib/kanmerPath.ts
   +export type KanmerPathChange = {
   +  key: string;
   +  kind: "board" | "item" | "document";
   +};
   +
   +export function classifyKanmerPath(file: string): KanmerPathChange | null {
   +  const parts = file.split(/[\\/]/).filter(Boolean);
   +  const base = parts.at(-1) ?? "";
   +  if (base === "board.yml" && parts.at(-2) === "data") return { key: "board", kind: "board" };
   +  if (!base.endsWith(".md")) return null;
   +  const name = base.slice(0, -3);
   +  const areas = parts.lastIndexOf("areas");
   +  if (areas >= 0 && parts.length === areas + 4) {
   +    const ticket = parts[areas + 2];
   +    return { key: ticket, kind: name === ticket ? "item" : "document" };
   +  }
   +  const legacy = parts.at(-2);
   +  if (legacy === "tickets" || legacy === "plans" || legacy === "research") {
   +    return { key: name, kind: "item" };
   +  }
   +  return null;
   +}
   ```

   ```diff
   --- a/apps/gui/src/main/index.ts
   +++ b/apps/gui/src/main/index.ts
   @@
   -function toastKey(file: string): string | null { ...hardcoded five-doc list... }
   +function toastKey(file: string): string | null {
   +  return classifyKanmerPath(file)?.key ?? null;
   +}
   ```

   ```diff
   --- a/apps/gui/src/renderer/src/App.tsx
   +++ b/apps/gui/src/renderer/src/App.tsx
   @@
   -let id = base.slice(0, -3);
   -const parent = parts[parts.length - 2];
   -const isDoc = parent !== undefined && parent !== id;
   -if (isDoc) id = parent;
   +const change = classifyKanmerPath(payload.file);
   +if (!change || change.kind === "board") { await refresh(); return; }
   +const id = change.key;
   +const isDoc = change.kind === "document";
   ```

   **Proof:** classifier tests; v1 external edit patches the correct id; custom doc
   and scratch changes toast/reveal the ticket; GUI-owned custom-doc writes are
   suppressed by the ticket-id own-write marker.

3. **Make last-stage board writes honor configured area gates — fix PR #5, then restack PRs #6–#13.**

   **Files:**

   - `packages/core/src/store.ts`
   - `packages/core/src/store.test.ts`
   - `AGENTS.md`

   **Changes:**

   1. Pass the proposed board to the final-stage invariant.
   2. Extract gate-context collection (`present` docs and `repoDocSatisfied`) so
      normal moves and board writes use the same `evaluateGates` engine.
   3. For each non-archived v2 occupant of the proposed last stage, evaluate the
      transition from the immediately preceding proposed stage into the last
   stage. This applies both sides of that boundary (`leave` on the predecessor
   and `enter` on the final stage), including repo-doc and `docs_todo` rules;
   gates for missing stages remain inert.
   4. Aggregate the real violation reasons per ticket and reject before writing.
   5. Replace unconditional “last stage is proof-gated” documentation with
      “last-stage boundary uses the resolved configured gates.”

   **Exact diff shape:**

   ```diff
   --- a/packages/core/src/store.ts
   +++ b/packages/core/src/store.ts
   @@
   -await this.assertFinalStageProven(nextLast);
   +await this.assertFinalStageGates(board, nextLast);
   @@
   -private async assertFinalStageProven(stageId: string): Promise<void> {
   +private async assertFinalStageGates(board: BoardConfig, stageId: string): Promise<void> {
      const occupants = await this.listItems({ status: stageId });
   -  const offenders: string[] = [];
   +  const prior = board.statuses.at(-2)?.id;
   +  if (prior === undefined) return;
   +  const failures: string[] = [];
      for (const item of occupants) {
        if (item.type !== "ticket") continue;
        const loc = await this.locateItem(item.id);
        if (!loc || loc.kind !== "v2") continue;
   -    if (!(await pathExists(docFileIn(loc.dir, "proof")))) offenders.push(item.id);
   +    const context = await this.gateContext(loc.dir, board, item);
   +    const violations = evaluateGates(resolveGates(board, item.area), {
   +      statuses: board.statuses.map((s) => s.id),
   +      from: prior,
   +      to: stageId,
   +      ...context,
   +    });
   +    for (const violation of violations) failures.push(`${item.id}: ${violation.reason}`);
      }
   -  if (offenders.length === 0) return;
   -  throw new Error(`Cannot make ... proof.md ...`);
   +  if (failures.length === 0) return;
   +  throw new Error(`Cannot make "${stageId}" the final stage — configured document gates are unmet:\n  - ${failures.join("\n  - ")}`);
    }
   ```

   The extraction must also replace `assertDocGate`'s duplicated `present` and
   `repoDocSatisfied` construction; do not create a second subtly different
   implementation merely to match the abbreviated diff above.

   **Tests:** default proof failure/success; custom per-area doc failure/success;
   repo-doc with and without `docs_todo`; `leave` rule; inert missing-stage rule;
   archived and v1 occupants; failed board write remains byte-identical.

4. **Complete dispatch project-scoping regression coverage — fix PR #12, then restack PR #13.**

   **Files:**

   - `apps/gui/src/main/dispatch.test.ts`
   - `apps/gui/src/shared/ipc.ts` (comments only if signatures already match)
   - `apps/gui/src/preload/index.ts` (no behavior change unless a test exposes drift)

   **Changes:**

   1. Keep the existing two-project `TICK-001` test.
   2. Assert `listDispatches("project-a")` and `listDispatches("project-b")`
      never leak the other project.
   3. Cancel B by `dispatchId`, assert only B's injected child is killed, and
      prove A remains in `running` state.
   4. Close B, assert A remains indexed; close A, assert both indexes are empty.
   5. Assert every emitted `DispatchStatus` includes the correct `projectId` and
      that the renderer/preload API types require a project for list and a
      dispatch id for cancel.

   ```diff
   +expect(listDispatches("project-a").map((d) => d.projectId)).toEqual(["project-a"]);
   +expect(listDispatches("project-b").map((d) => d.projectId)).toEqual(["project-b"]);
   +expect(cancelDispatch(startedB.dispatchId)).toBe(true);
   +expect(killed).toEqual([childB.pid]);
   +expect(listDispatches("project-a")[0]?.state).toBe("running");
   ```

   **Proof:** GUI tests, typecheck and a manual two-project drawer/reveal/cancel run.

5. **Add destructive-disconnect ownership tests and accurate result reporting — fix PR #9, then restack PRs #10–#13.**

   **Files:**

   - `apps/gui/src/main/connect.ts`
   - `apps/gui/src/main/connect.test.ts` (new)

   **Changes:**

   1. Export test seams for the bundled plugin root or extract
      `removeBundledSkillsOnly` and peer-registration detection into a pure helper.
   2. Test that an unknown `.grok/skills/mycompany-review/` directory and unknown
      file remain byte-identical while all bundled `kanmer-*` children and the
      version marker are removed.
   3. Test every opencode/Grok/Antigravity disconnect order. The AGENTS block must
      remain until the last registered `copySkills` provider is gone.
   4. Test malformed/indeterminate peer configuration preserves the block.
   5. Return separate output facts for provider registration removal, copied-skill
      removal and whether the shared block was retained or removed.

   ```diff
   -if (!(await hasRegisteredCopySkillsPeer(id, projectRoot))) await dropAgentsBlock(projectRoot);
   +const peerRemains = await hasRegisteredCopySkillsPeer(id, projectRoot);
   +if (!peerRemains) await dropAgentsBlock(projectRoot);
   +cleanupNotes.push(peerRemains
   +  ? "AGENTS.md block retained for another connected host"
   +  : "AGENTS.md block removed; no connected copy-skills host remains");
   @@
   -return { ok: true, command: `disconnect ${id}`, output: "Disconnected." };
   +return { ok: true, command: `disconnect ${id}`, output: cleanupNotes.join("; ") };
   ```

   **Proof:** new temporary-directory test suite plus GUI typecheck/build.

6. **Add dirty-tab close state-transition coverage — fix PR #12, then restack PR #13.**

   **Files:**

   - `apps/gui/src/renderer/src/lib/tabClose.ts` (new)
   - `apps/gui/src/renderer/src/lib/tabClose.test.ts` (new)
   - `apps/gui/src/renderer/src/App.tsx`

   **Changes:**

   1. Extract the pure decision “prompt or close” from `closeTab`.
   2. Test active-dirty close prompts without calling `closeProject`; Cancel
      preserves selection/text; Confirm calls `performCloseTab` exactly once.
   3. Test active-clean and inactive closes are immediate.
   4. Test the last-tab path clears root/board/items and repeated close gestures
      cannot invoke `closeProject` twice.

   ```diff
   +export function tabCloseDecision(projectId: string, activeId: string | null, dirty: boolean) {
   +  return projectId === activeId && dirty ? "confirm" as const : "close" as const;
   +}
   @@
   -if (projectId === rootRef.current && editorDirty.current) {
   +if (tabCloseDecision(projectId, rootRef.current, editorDirty.current) === "confirm") {
   ```

   **Proof:** pure unit tests and a manual body-edit/document-edit × and
   middle-click run for Cancel and Discard.

7. **Distinguish backfill failure from post-write readback failure and add reconciliation tests — fix PR #13.**

   **Files:**

   - `apps/gui/src/renderer/src/components/Settings.tsx`
   - `apps/gui/src/renderer/src/lib/settingsDraft.ts` (new)
   - `apps/gui/src/renderer/src/lib/settingsDraft.test.ts` (new)

   **Changes:**

   1. Split the backfill call and readback into separate `try` blocks. If
      `backfillBoard` rejects, report “Backfill failed” and leave Save available
      for the unchanged draft. Only a failed `getBoard` after successful backfill
      may set `reloadRequired` and say the write applied.
   2. Extract draft replacement/modified comparison into a pure helper.
   3. Test backfill→refresh→unrelated edit→Save retains inserted stages; test
      already-current, dirty-before-backfill, write failure and readback failure.

   ```diff
   -try {
   -  const result = await client.backfillBoard(false);
   -  const refreshed = await client.getBoard();
   +let result;
   +try {
   +  result = await client.backfillBoard(false);
   +} catch (err) {
   +  setError(`Backfill failed: ${messageOf(err)}`);
   +  return;
   +}
   +try {
   +  const refreshed = await client.getBoard();
      setDraft(reconcileBoardDraft(refreshed));
   -} catch (err) {
   +} catch (err) {
      setReloadRequired(true);
      setError(`Backfill applied but Settings could not refresh: ${messageOf(err)}`);
    }
   ```

   **Proof:** new helper tests, GUI tests/typecheck, and persisted `board.yml`
   readback after Backfill→deployment edit→Save.

8. **Add empty-session restore and migration coverage — fix PR #12, then restack PR #13.**

   **Files:**

   - `apps/gui/src/main/settings.test.ts` (new)
   - `apps/gui/src/renderer/src/lib/session.ts` (new)
   - `apps/gui/src/renderer/src/lib/session.test.ts` (new)
   - `apps/gui/src/renderer/src/App.tsx`

   **Changes:**

   1. Extract restore selection into a pure function taking `openTabs`,
      `activeTab`, `sessionInitialized` and legacy `currentProject`.
   2. Test pre-session settings fall back once, while an initialized empty
      session never falls back and stays on Welcome.
   3. Test final-tab close writes `openTabs: []`, `activeTab: ""` and
      `sessionInitialized: true`.
   4. Test one/many tabs, invalid active tab, failed restored paths and restart.

   ```diff
   +export function restoreTabs(settings: AppSettings, currentProject: string | null): string[] {
   +  if (settings.openTabs.length > 0) return settings.openTabs;
   +  if (settings.sessionInitialized) return [];
   +  return currentProject ? [currentProject] : [];
   +}
   @@
   -let toOpen = s.openTabs;
   -if (toOpen.length === 0 && !s.sessionInitialized) { ... }
   +const toOpen = restoreTabs(s, await window.kanmer.currentProject());
   ```

   **Proof:** settings/session tests and an actual restart after closing the final
   tab; Welcome must remain visible and settings readback must stay empty.

9. **Add configurable progress-document regression coverage — fix PR #7, then restack PRs #8–#13.**

   **Files:**

   - `apps/gui/src/renderer/src/lib/docProgress.ts` (new)
   - `apps/gui/src/renderer/src/lib/docProgress.test.ts` (new)
   - `apps/gui/src/renderer/src/components/Editor.tsx`

   **Changes:**

   1. Extract the progress-id lookup used by both tab counting and `DocEditor`.
   2. Test default `checklist`, renamed `tasks`, per-area resolved types and no
      progress document. Core schema tests must continue rejecting multiple
      progress flags if that is the intended invariant.
   3. Add a component/manual scenario proving checkbox toggle, optimistic version
      conflict and counter refresh all target the renamed document.

   ```diff
   +export function progressDocId(types: DocType[]): string | undefined {
   +  return types.find((type) => type.progress)?.id;
   +}
   @@
   -const progressDoc = docTypes.find((d) => d.progress)?.id;
   +const progressDoc = progressDocId(docTypes);
   ```

   **Proof:** new pure tests, GUI tests/typecheck, and manual `tasks.md` checkbox
   persistence with the count changing on the Tasks tab.

## Required completion sequence

1. Apply items to their owning branches in PR order: #5 → #7 → #9 → #10 → #12
   → #13.
2. After each earlier-branch change, rebase every descendant branch and push with
   `--force-with-lease` only after confirming its remote head.
3. Run focused tests on each owning branch.
4. On the final PR #13 head run `npm test`, GUI typecheck/build, both MCP smoke
   scripts, GUI boot smoke, and `git diff --check`.
5. Update the nine finding pages with implementation commit, test evidence and
   final disposition; only then describe the ultrareview as fully remediated.
