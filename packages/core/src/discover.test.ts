import { describe, expect, it } from "vitest";
import path from "node:path";
import { discoverBoardRoot, type DiscoverIO } from "./discover.js";

/**
 * A fake filesystem over two sets of absolute paths: `dirs` (directories) and
 * `files` (everything else). Paths are written POSIX-style and normalised
 * through `path.resolve`, so these tests read the same on Windows and Linux.
 *
 * The split matters: `.git` in a git *linked worktree* is a FILE, and the whole
 * boundary rule turns on telling the two apart (ADR-0012).
 */
function fakeIO(tree: { dirs?: string[]; files?: string[] }): DiscoverIO {
  const norm = (p: string) => path.resolve(p);
  const dirs = new Set((tree.dirs ?? []).map(norm));
  const files = new Set((tree.files ?? []).map(norm));
  return {
    existsSync: (p) => dirs.has(norm(p)) || files.has(norm(p)),
    isDirectory: (p) => dirs.has(norm(p)),
    readdirSync: (p) => {
      const parent = norm(p);
      if (!dirs.has(parent)) throw new Error(`ENOENT: ${p}`);
      const names = new Set<string>();
      for (const entry of [...dirs, ...files]) {
        if (path.dirname(entry) === parent && entry !== parent) names.add(path.basename(entry));
      }
      return [...names];
    },
  };
}

/** Absolute root of the fake tree — drive-qualified on Windows, `/` elsewhere. */
const R = path.resolve("/repos");
const at = (...parts: string[]) => path.join(R, ...parts);

/**
 * The marker that makes a `.kanmer` directory a board (MCP-056): every fixture
 * board carries `version.json`, the file every format-2+ board has. A bare
 * `.kanmer` directory is exactly what `~/.kanmer` (the FRD-029 endpoint
 * registry) looks like, and discovery must not bind to it.
 */
const marker = (...parts: string[]) => at(...parts, ".kanmer", "version.json");

describe("discoverBoardRoot", () => {
  it("finds a colocated board at the start directory", () => {
    const io = fakeIO({ dirs: [R, at("proj"), at("proj", ".kanmer")], files: [marker("proj")] });
    const res = discoverBoardRoot(at("proj"), io);
    expect(res).toMatchObject({ found: true, root: at("proj"), how: "cwd" });
  });

  it("finds a board parked in .worktrees/kanmer at the start directory", () => {
    const io = fakeIO({
      dirs: [
        R,
        at("proj"),
        at("proj", ".worktrees"),
        at("proj", ".worktrees", "kanmer"),
        at("proj", ".worktrees", "kanmer", ".kanmer"),
      ],
      files: [at("proj", ".git"), marker("proj", ".worktrees", "kanmer")],
    });
    const res = discoverBoardRoot(at("proj"), io);
    expect(res).toMatchObject({
      found: true,
      root: at("proj", ".worktrees", "kanmer"),
      how: "cwd-worktree",
    });
  });

  it("walks up from a directory two levels deep to a colocated board", () => {
    const io = fakeIO({
      dirs: [
        R,
        at("proj"),
        at("proj", ".kanmer"),
        at("proj", "src"),
        at("proj", "src", "lib"),
      ],
      files: [marker("proj")],
    });
    const res = discoverBoardRoot(at("proj", "src", "lib"), io);
    expect(res).toMatchObject({ found: true, root: at("proj"), how: "ancestor" });
  });

  it("traverses a .git FILE: from inside a ticket worktree it still reaches the board", () => {
    // The regression test for ADR-0012's corrected premise. `kanmer-execute`
    // puts every implementing agent in `.worktrees/<id>`, whose `.git` is a
    // 66-byte `gitdir:` FILE. A "stop wherever .git exists" walk would halt at
    // `.worktrees/api-003` and never see `.worktrees/kanmer/.kanmer`.
    const io = fakeIO({
      dirs: [
        R,
        at("proj"),
        at("proj", ".worktrees"),
        at("proj", ".worktrees", "kanmer"),
        at("proj", ".worktrees", "kanmer", ".kanmer"),
        at("proj", ".worktrees", "api-003"),
        at("proj", ".worktrees", "api-003", "src"),
      ],
      files: [
        at("proj", ".git"), // a directory in reality; a file here would also pass
        at("proj", ".worktrees", "api-003", ".git"), // the linked-worktree pointer
        at("proj", ".worktrees", "kanmer", ".git"),
        marker("proj", ".worktrees", "kanmer"),
      ],
    });
    const res = discoverBoardRoot(at("proj", ".worktrees", "api-003", "src"), io);
    expect(res).toMatchObject({
      found: true,
      root: at("proj", ".worktrees", "kanmer"),
      how: "ancestor-worktree",
    });
  });

  it("stops at a .git DIRECTORY and does not latch onto an unrelated parent board", () => {
    const io = fakeIO({
      dirs: [
        R,
        at("parent"),
        at("parent", ".kanmer"), // an unrelated board, must NOT be found
        at("parent", "nested"),
        at("parent", "nested", ".git"), // a real repository boundary
        at("parent", "nested", "src"),
      ],
      files: [marker("parent")],
    });
    const res = discoverBoardRoot(at("parent", "nested", "src"), io);
    expect(res.found).toBe(false);
    expect(res.tried).not.toContain(at("parent", ".kanmer"));
  });

  it("probes a level BEFORE applying its boundary (repo root holds .git and .worktrees)", () => {
    // Boundary-first would stop at `<repo>` on account of `.git` and never
    // probe `<repo>/.worktrees/*`, which is where the board actually is.
    const io = fakeIO({
      dirs: [
        R,
        at("proj"),
        at("proj", ".git"), // a REAL .git directory, i.e. the hard boundary
        at("proj", ".worktrees"),
        at("proj", ".worktrees", "kanmer"),
        at("proj", ".worktrees", "kanmer", ".kanmer"),
        at("proj", "src"),
      ],
      files: [marker("proj", ".worktrees", "kanmer")],
    });
    const res = discoverBoardRoot(at("proj", "src"), io);
    expect(res).toMatchObject({
      found: true,
      root: at("proj", ".worktrees", "kanmer"),
      how: "ancestor-worktree",
    });
  });

  it("tie-breaks several .worktrees/* candidates in favour of the exact leaf `kanmer`", () => {
    const io = fakeIO({
      dirs: [
        R,
        at("proj"),
        at("proj", ".worktrees"),
        at("proj", ".worktrees", "aaa"),
        at("proj", ".worktrees", "aaa", ".kanmer"),
        at("proj", ".worktrees", "kanmer"),
        at("proj", ".worktrees", "kanmer", ".kanmer"),
      ],
      files: [marker("proj", ".worktrees", "aaa"), marker("proj", ".worktrees", "kanmer")],
    });
    const res = discoverBoardRoot(at("proj"), io);
    expect(res).toMatchObject({ found: true, root: at("proj", ".worktrees", "kanmer") });
  });

  it("tie-breaks lexicographically when no candidate is named `kanmer`, naming both", () => {
    const io = fakeIO({
      dirs: [
        R,
        at("proj"),
        at("proj", ".worktrees"),
        at("proj", ".worktrees", "board-a"),
        at("proj", ".worktrees", "board-a", ".kanmer"),
        at("proj", ".worktrees", "board-b"),
        at("proj", ".worktrees", "board-b", ".kanmer"),
      ],
      files: [marker("proj", ".worktrees", "board-a"), marker("proj", ".worktrees", "board-b")],
    });
    const res = discoverBoardRoot(at("proj"), io);
    expect(res).toMatchObject({ found: true, root: at("proj", ".worktrees", "board-a") });
    // The losing candidate is not named — the walk stops at the first hit — but
    // the winner is, and so is every path probed ahead of it.
    expect(res.tried).toContain(at("proj", ".worktrees", "board-a", ".kanmer"));
  });

  it("reports every path it tried when there is no board anywhere", () => {
    const io = fakeIO({ dirs: [R, at("proj"), at("proj", "src")] });
    const res = discoverBoardRoot(at("proj", "src"), io);
    expect(res.found).toBe(false);
    expect(res.tried).toEqual([
      at("proj", "src", ".kanmer"),
      at("proj", "src", ".worktrees", "*", ".kanmer"),
      at("proj", ".kanmer"),
      at("proj", ".worktrees", "*", ".kanmer"),
      at(".kanmer"),
      at(".worktrees", "*", ".kanmer"),
      path.join(path.dirname(R), ".kanmer"),
      path.join(path.dirname(R), ".worktrees", "*", ".kanmer"),
    ]);
  });

  it("terminates at the filesystem root rather than looping", () => {
    const io = fakeIO({ dirs: [] });
    const res = discoverBoardRoot(path.parse(R).root, io);
    expect(res.found).toBe(false);
    expect(res.tried).toEqual([
      path.join(path.parse(R).root, ".kanmer"),
      path.join(path.parse(R).root, ".worktrees", "*", ".kanmer"),
    ]);
  });

  it("treats an unreadable .worktrees as empty rather than throwing", () => {
    const io: DiscoverIO = {
      existsSync: (p) => p.endsWith(".worktrees"),
      isDirectory: () => false,
      readdirSync: () => {
        throw new Error("EPERM");
      },
    };
    expect(() => discoverBoardRoot(at("proj"), io)).not.toThrow();
    expect(discoverBoardRoot(at("proj"), io).found).toBe(false);
  });

  // MCP-056: what makes a `.kanmer` a board.

  it("skips a registry-only .kanmer at an ancestor, names it as skipped, and keeps walking", () => {
    // `~/.kanmer/endpoints.json` is the FRD-029 endpoint registry, not a board.
    // Before MCP-056 any cwd beneath `~` with no board of its own bound to `~`.
    const io = fakeIO({
      dirs: [R, at("home"), at("home", ".kanmer"), at("home", "tmp"), at("home", "tmp", "work")],
      files: [at("home", ".kanmer", "endpoints.json")],
    });
    const res = discoverBoardRoot(at("home", "tmp", "work"), io);
    expect(res.found).toBe(false);
    expect(res.tried).toContain(`${at("home", ".kanmer")} (no board marker)`);
    expect(res.tried).not.toContain(at("home", ".kanmer"));
  });

  it("skips a registry-only .kanmer and still finds the real board beyond it", () => {
    const io = fakeIO({
      dirs: [
        R,
        at("proj"),
        at("proj", ".kanmer"),
        at("proj", "vendor"),
        at("proj", "vendor", ".kanmer"), // a decoy on the way up
        at("proj", "vendor", "pkg"),
      ],
      files: [marker("proj"), at("proj", "vendor", ".kanmer", "endpoints.json")],
    });
    const res = discoverBoardRoot(at("proj", "vendor", "pkg"), io);
    expect(res).toMatchObject({ found: true, root: at("proj"), how: "ancestor" });
    expect(res.tried).toContain(`${at("proj", "vendor", ".kanmer")} (no board marker)`);
  });

  it("skips a registry-only .kanmer inside .worktrees/* in favour of a real board candidate", () => {
    const io = fakeIO({
      dirs: [
        R,
        at("proj"),
        at("proj", ".worktrees"),
        at("proj", ".worktrees", "kanmer"),
        at("proj", ".worktrees", "kanmer", ".kanmer"), // named `kanmer` but not a board
        at("proj", ".worktrees", "zzz"),
        at("proj", ".worktrees", "zzz", ".kanmer"),
      ],
      files: [at("proj", ".worktrees", "kanmer", ".kanmer", "endpoints.json"), marker("proj", ".worktrees", "zzz")],
    });
    const res = discoverBoardRoot(at("proj"), io);
    expect(res).toMatchObject({ found: true, root: at("proj", ".worktrees", "zzz"), how: "cwd-worktree" });
    expect(res.tried).toContain(`${at("proj", ".worktrees", "kanmer", ".kanmer")} (no board marker)`);
  });

  it("does not treat a .kanmer FILE as a board", () => {
    const io = fakeIO({ dirs: [R, at("proj")], files: [at("proj", ".kanmer")] });
    const res = discoverBoardRoot(at("proj"), io);
    expect(res.found).toBe(false);
    expect(res.tried[0]).toBe(`${at("proj", ".kanmer")} (no board marker)`);
  });

  it.each([
    ["version.json", { files: [at("proj", ".kanmer", "version.json")] }],
    ["data/board.yml", { dirs: [at("proj", ".kanmer", "data")], files: [at("proj", ".kanmer", "data", "board.yml")] }],
    ["project.json", { files: [at("proj", ".kanmer", "project.json")] }],
    ["areas/ (format 2 without a version file)", { dirs: [at("proj", ".kanmer", "areas")] }],
    ["tickets/ (legacy format 1)", { dirs: [at("proj", ".kanmer", "tickets")] }],
  ])("accepts a .kanmer carrying only %s as a board", (_label, extra: { dirs?: string[]; files?: string[] }) => {
    const io = fakeIO({
      dirs: [R, at("proj"), at("proj", ".kanmer"), ...(extra.dirs ?? [])],
      files: extra.files ?? [],
    });
    expect(discoverBoardRoot(at("proj"), io)).toMatchObject({ found: true, root: at("proj"), how: "cwd" });
  });
});
