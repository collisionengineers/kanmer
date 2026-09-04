// The one shared verification rail for PRs and releases. Keep this
// dependency-free: it is both directly executable and imported by release.mjs.
import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The authoritative ordered verification commands for PRs and releases. */
export const VERIFY_STEPS = Object.freeze([
  "npm run build",
  // The renderer bundles @kanmer/core/browser; only a real build proves the
  // renderer graph stays browser-safe (GUI-146).
  "npm run build -w @kanmer/gui",
  // The GUI imports @kanmer/core from its package export. A clean checkout
  // has no generated dist yet, so build the workspace artifacts before tests.
  "npm test",
  "npm run typecheck",
  "npm run verify:docs",
  "node packages/mcp-server/src/smoke.mjs",
  "npm run smoke:headless",
  "npm run mcpb:check",
  "npm run smoke:protocol",
  "npm run smoke:discovery",
  // FRD-035 AC1/AC5: the golden-board evaluation runs every scenario class
  // against disposable mkdtemp boards and fails closed on its own wall-clock
  // budget. It joins this one array rather than a new workflow because
  // AGENTS.md says to extend VERIFY_STEPS, never build a third verification
  // pyramid — one edit reaches pr.yml, main pushes, release.yml and release.mjs.
  "npm run golden",
  "npm run verify:skills",
  "npm run verify:agents-block",
  "npm run plugin:check",
]);

function run(command, env = process.env) {
  console.log(`\n$ ${command}`);
  execSync(command, { cwd: root, env, stdio: "inherit" });
}

// fileURLToPath avoids URL/path separator differences when this script runs on
// Windows. Importing this module must expose the array without running the rail.
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  // HTTP integration tests resolve a board through the normal discovery path.
  // A standalone clone has no sibling board worktree, so give that one child
  // a disposable empty board while leaving every other rail step's environment
  // untouched. This keeps `npm run verify` reproducible without mutating the
  // checkout or weakening the discovery smoke's no-board assertions.
  const testBoard = mkdtempSync(join(tmpdir(), "kanmer-verify-board-"));
  mkdirSync(join(testBoard, ".kanmer"));
  writeFileSync(join(testBoard, ".kanmer", "version.json"), '{"format":3}\n', "utf8");
  try {
    for (const step of VERIFY_STEPS) {
      run(step, step === "npm test" ? { ...process.env, KANMER_ROOT: testBoard } : process.env);
    }
  } finally {
    rmSync(testBoard, { recursive: true, force: true });
  }
}
