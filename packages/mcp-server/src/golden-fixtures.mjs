// Golden fixture boards (CORE-119, FRD-035 AC1/AC2).
//
// Three shapes, none copied from any real board, backup or credential:
//
//   fresh   — the two-file `.kanmer/version.json` `{"format":3}` skeleton the
//             rail already uses at `scripts/verify.mjs:45-47`.
//   seeded  — `KanmerStore.init()` plus a small census (two areas, one group,
//             six tickets across every stage, one capture, one `feature`
//             ticket carrying research/files/plan/checklist with a structured
//             `### Step 1 — …` plan). Its `legacy` variant deletes
//             `project.json` afterwards, the `smoke.mjs:725-775` idiom.
//   repo    — `seeded`, but with the board parked at `<root>/.worktrees/kanmer`
//             beside an offline `git init`: one commit on `main`, a
//             `feature/golden` branch, one kept worktree, one worktree whose
//             directory is then deleted on disk, and the board worktree itself
//             standing in for the protected Kanmer board.
//
// Every root is a `kanmer-golden-*` mkdtemp directory; every fixture returns
// `{root, meta, close()}`; and `meta` names the ids the scenarios use so no
// scenario hard-codes an id it did not create.
//
// Git is used offline only (`init`/`add`/`commit`/`branch`/`worktree`), always
// with `-c user.email`/`-c user.name` inline so no global config is required
// and with `windowsHide: true` so the rail does not flash console windows
// (AGENTS.md §8 gotcha 20). A missing `git` is REPORTED (`git: "unavailable"`),
// never thrown and never silently skipped.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { KanmerStore } from "../../core/dist/index.js";
import { assertDisposable, disposableBoard } from "./golden-harness.mjs";

/** Inline identity: no global git config is required, and none is written. */
const GIT_IDENTITY = [
  "-c",
  "user.email=golden@example.invalid",
  "-c",
  "user.name=golden",
  "-c",
  "commit.gpgsign=false",
  "-c",
  "core.hooksPath=",
];

function git(cwd, args) {
  return execFileSync("git", [...GIT_IDENTITY, ...args], {
    cwd,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    timeout: 60_000,
  });
}

export function gitAvailable() {
  try {
    execFileSync("git", ["--version"], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"], timeout: 20_000 });
    return true;
  } catch {
    return false;
  }
}

/** The bare skeleton `scripts/verify.mjs` already injects for one rail step. */
export async function freshFixture() {
  const board = disposableBoard("fresh");
  fs.mkdirSync(path.join(board.root, ".kanmer"), { recursive: true });
  fs.writeFileSync(path.join(board.root, ".kanmer", "version.json"), '{"format":3}\n', "utf8");
  return {
    kind: "fresh",
    root: board.root,
    boardRoot: board.root,
    meta: { git: "not-applicable" },
    close: () => board.close(),
  };
}

// The plan pins the exact content versions of the evidence it was written
// against: step compilation refuses a plan whose `## Starting state` does not
// match the current `research`/`files` versions, which is the point — a packet
// must not be minted from superseded evidence.
const STEP_PLAN = (researchVersion, filesVersion) => `# Plan — golden feature ticket

## Objective

Change one bounded file so a step packet can be compiled from this plan.

## Starting state

Evidence: \`research/research.md\`@\`${researchVersion}\`, \`files/files.md\`@\`${filesVersion}\`.

## Governing docs

Meets \`docs/functional/frd/FRD-033.md\`.

## Required changes

Change \`tracked.txt\`.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | \`tracked.txt\` | the one bounded change |

## Do not modify

- \`forbidden/**\`

## Constraints

Stay inside the packet. Decide the exact ordering as appropriate.

## Ordered steps

### Step 1 — Change the tracked file

- Preconditions: the baseline file exists.
- Files: \`tracked.txt\`
- Change: replace the single line.
- Preserved behaviour: nothing else changes.
- Forbidden: any other path.
- Negative cases: a write under \`forbidden/\`.
- Tests: \`tracked.txt\`
- Commands: \`git diff --check\`
- Expected output: clean.
- Done when: the file changed.
- Deviation stop: stop on any other path.

## Acceptance checks

- \`git diff --check\` is silent.

## Commands

\`\`\`
git diff --check
\`\`\`

## Failure and deviation rules

Stop and report rather than widening the packet.

## Stop condition

Stop after step 1 reconciles.
`;

const STEP_CHECKLIST = `# Checklist — golden feature ticket

- [ ] Step 1 — Change the tracked file so the step packet has one mapped marker.
- [ ] Acceptance — \`git diff --check\` is silent.
`;

/**
 * Seed a board that already exists at `boardRoot`. Split out so `repoFixture`
 * can seed the board it parked inside a Git checkout without duplicating the
 * census.
 */
async function seedBoard(boardRoot, { legacy = false } = {}) {
  assertDisposable(boardRoot);
  const store = new KanmerStore(boardRoot, { actor: "golden" });
  await store.init();
  await store.addColumn("area", { id: "core", name: "Core", prefix: "CORE", color: "#5b8cff" });

  const group = await store.createGroup("epic", "Golden evaluation epic", "The one group every golden roster reads.");

  const mk = async (title, extra = {}) =>
    store.createItem({ type: "ticket", title, area: "core", ...extra });

  // Six tickets, one per stage, created directly at that stage: `createItem`
  // does not run gates, so the census does not need to walk the pipeline.
  const backlog = await mk("Golden backlog ticket", { status: "backlog", profile: "fix", groups: [group.id] });
  const preparing = await mk("Golden preparing ticket", { status: "preparing", profile: "fix", groups: [group.id] });
  const implementing = await mk("Golden implementing ticket", { status: "implementing", profile: "fix" });
  const review = await mk("Golden review ticket", { status: "review", profile: "fix", prs: ["12"] });
  const verifying = await mk("Golden verifying ticket", { status: "verifying", profile: "fix", prs: ["12"] });
  const done = await mk("Golden done ticket", { status: "done", profile: "fix" });

  const capture = await store.createItem({
    type: "ticket",
    title: "Golden capture observation",
    area: "core",
    profile: "capture",
    body: "Observed once while driving the golden board; nobody has decided it should be delivered.",
  });

  // The `feature` ticket the step-packet scenario compiles a packet from.
  const feature = await mk("Golden feature ticket with a structured plan", {
    status: "preparing",
    profile: "feature",
    docs_todo: true,
  });
  const research = await store.setDoc(feature.id, "research", "# Research — golden feature ticket\n\nRecorded so the leave-preparing gate has its input.\n");
  const files = await store.setDoc(feature.id, "files", "# Files — golden feature ticket\n\n| Path | Why |\n|---|---|\n| `tracked.txt` | the bounded change |\n");
  await store.setDoc(feature.id, "plan", STEP_PLAN(research.version, files.version));
  await store.setDoc(feature.id, "checklist", STEP_CHECKLIST);

  if (legacy) {
    // The `smoke.mjs:725-775` idiom: a board with no project.json reports an
    // unassigned identity until its first write migrates one.
    fs.rmSync(path.join(boardRoot, ".kanmer", "project.json"), { force: true });
  }

  return {
    group: group.id,
    backlog: backlog.id,
    preparing: preparing.id,
    implementing: implementing.id,
    review: review.id,
    verifying: verifying.id,
    done: done.id,
    capture: capture.id,
    feature: feature.id,
    legacy,
  };
}

export async function seededFixture({ legacy = false } = {}) {
  const board = disposableBoard(legacy ? "legacy" : "seeded");
  const meta = await seedBoard(board.root, { legacy });
  return {
    kind: legacy ? "legacy" : "seeded",
    root: board.root,
    boardRoot: board.root,
    meta: { ...meta, git: "not-applicable" },
    close: () => board.close(),
  };
}

/**
 * A seeded board inside an offline Git checkout.
 *
 * Layout, which is Kanmer's own: the source checkout is `<root>` and the board
 * is `<root>/.worktrees/kanmer`, so `deriveRepoRoot` recovers the repository
 * from the board path with no flag. That is what makes the board-worktree
 * protection assertable — `workspaceEvidence` marks a recorded workspace as the
 * board worktree by comparing it with the project root, not by its name.
 */
export async function repoFixture() {
  const board = disposableBoard("repo");
  const root = board.root;
  if (!gitAvailable()) {
    return {
      kind: "repo",
      root,
      boardRoot: root,
      meta: { git: "unavailable", reason: "git --version failed" },
      close: () => board.close(),
    };
  }
  try {
    git(root, ["init", "--initial-branch=main", "--quiet"]);
    fs.writeFileSync(path.join(root, "tracked.txt"), "baseline\n", "utf8");
    fs.writeFileSync(path.join(root, ".gitignore"), ".worktrees/\n.kanmer/\n", "utf8");
    git(root, ["add", "-A"]);
    git(root, ["commit", "-m", "golden baseline", "--quiet"]);
    git(root, ["branch", "feature/golden"]);
    git(root, ["branch", "feature/gone"]);
    git(root, ["branch", "feature/step"]);
    git(root, ["branch", "kanmer-board"]);

    // The board worktree stand-in: a real registered worktree at the canonical
    // `.worktrees/kanmer` path, which is what the protection rule is about.
    git(root, ["worktree", "add", "--quiet", path.join(".worktrees", "kanmer"), "kanmer-board"]);
    // One kept worktree, checked out on the branch its ticket records.
    git(root, ["worktree", "add", "--quiet", path.join(".worktrees", "keep"), "feature/golden"]);
    // One worktree whose directory is then deleted on disk: WORKSPACE_MISSING.
    git(root, ["worktree", "add", "--quiet", path.join(".worktrees", "gone"), "feature/gone"]);
    fs.rmSync(path.join(root, ".worktrees", "gone"), { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    // A clean worktree the constrained step packet is compiled against: a
    // step packet requires a proven recorded branch and worktree, so it cannot
    // share the deliberately dirty one.
    git(root, ["worktree", "add", "--quiet", path.join(".worktrees", "step"), "feature/step"]);
    // A SEPARATE repository under the same checkout: a recorded workspace whose
    // `--git-common-dir` differs is `foreign-repository`, which recovery must
    // still refuse. A bare directory would only be `unavailable`, which is a
    // different (and weaker) assertion.
    fs.mkdirSync(path.join(root, "foreign-repo"), { recursive: true });
    git(path.join(root, "foreign-repo"), ["init", "--initial-branch=golden/foreign", "--quiet"]);
    fs.writeFileSync(path.join(root, "foreign-repo", "readme.txt"), "a different repository\n", "utf8");
    git(path.join(root, "foreign-repo"), ["add", "-A"]);
    git(path.join(root, "foreign-repo"), ["commit", "-m", "foreign baseline", "--quiet"]);

    const boardRoot = path.join(root, ".worktrees", "kanmer");
    const meta = await seedBoard(boardRoot, {});
    // The dirty file FRD-028 AC4 preserves. Written into the kept worktree so a
    // recovery path can be proved not to touch it.
    fs.writeFileSync(path.join(root, ".worktrees", "keep", "tracked.txt"), "uncommitted golden work\n", "utf8");
    return {
      kind: "repo",
      root,
      boardRoot,
      meta: {
        ...meta,
        git: "available",
        repoRoot: root,
        keptWorktree: ".worktrees/keep",
        keptBranch: "feature/golden",
        missingWorktree: ".worktrees/gone",
        missingBranch: "feature/gone",
        stepWorktree: ".worktrees/step",
        foreignRepo: "foreign-repo",
        foreignBranch: "golden/foreign",
        stepBranch: "feature/step",
        boardWorktree: ".worktrees/kanmer",
        dirtyFile: path.join(root, ".worktrees", "keep", "tracked.txt"),
      },
      close: () => board.close(),
    };
  } catch (error) {
    return {
      kind: "repo",
      root,
      boardRoot: root,
      meta: { git: "unavailable", reason: String(error instanceof Error ? error.message : error).slice(0, 300) },
      close: () => board.close(),
    };
  }
}

/**
 * Age a claim on disk rather than injecting a clock: the store's own
 * precondition and `transferTicket` read real time, so a claim that only looked
 * expired to the collector must not be reachable from a golden scenario.
 * (`reconciliation.test.mjs:119-123` does the same for the same reason.)
 */
export function expireClaim(boardRoot, id) {
  const file = ticketFile(boardRoot, id);
  const aged = new Date(Date.now() - 60 * 60_000).toISOString();
  const raw = fs.readFileSync(file, "utf8");
  const next = raw.replace(/^claim_expires_at: .*$/mu, `claim_expires_at: '${aged}'`);
  if (next === raw) throw new Error(`expireClaim: no claim_expires_at in ${file}`);
  fs.writeFileSync(file, next, "utf8");
  return file;
}

/** Locate a v2 ticket file without guessing its area folder. */
export function ticketFile(boardRoot, id) {
  const areas = path.join(boardRoot, ".kanmer", "areas");
  for (const area of fs.readdirSync(areas)) {
    const candidate = path.join(areas, area, id, `${id}.md`);
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`ticketFile: no ticket ${id} under ${areas}`);
}
