import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { isPackaged: false, getAppPath: () => "/unused" } }));

const { disconnectAgent, reconcileSkills, removeBundledSkillsOnly } = await import("./connect.js");
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function tempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "kanmer-connect-"));
  roots.push(root);
  return root;
}

/** Write `{ "<skill>/<relative path>": contents }` under a root. */
async function writeTree(root: string, files: Record<string, string>): Promise<void> {
  for (const [rel, contents] of Object.entries(files)) {
    const target = join(root, ...rel.split("/"));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents);
  }
}

const missing = async (...segments: string[]) =>
  expect(readFile(join(...segments), "utf8")).rejects.toThrow();

describe("bundled skill removal", () => {
  it("removes only bundled children and preserves unknown skills and files byte-for-byte", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-connect-"));
    roots.push(root);
    const bundled = join(root, "bundled");
    const destination = join(root, ".grok", "skills");
    await mkdir(join(bundled, "kanmer-review"), { recursive: true });
    await mkdir(join(destination, "kanmer-review"), { recursive: true });
    await mkdir(join(destination, "mycompany-review"), { recursive: true });
    await writeFile(join(destination, "mycompany-review", "note.txt"), "keep exactly\n");
    await writeFile(join(destination, "user.txt"), "also keep\n");
    await writeFile(join(destination, ".kanmer-skills-version"), "1\n");

    await removeBundledSkillsOnly(root, ".grok/skills", bundled);

    await expect(readFile(join(destination, "mycompany-review", "note.txt"), "utf8")).resolves.toBe("keep exactly\n");
    await expect(readFile(join(destination, "user.txt"), "utf8")).resolves.toBe("also keep\n");
    await expect(readFile(join(destination, "kanmer-review"), "utf8")).rejects.toThrow();
    await expect(readFile(join(destination, ".kanmer-skills-version"), "utf8")).rejects.toThrow();
  });
});

describe("disconnect peer safety", () => {
  it("retains the shared block when another copy-skills host has malformed registration", async () => {
    const root = await mkdtemp(join(tmpdir(), "kanmer-connect-"));
    roots.push(root);
    await mkdir(join(root, ".agents"), { recursive: true });
    await writeFile(join(root, ".agents", "mcp_config.json"), JSON.stringify({ mcpServers: { kanmer: {} } }));
    await writeFile(join(root, "opencode.json"), "{ malformed");
    const result = await disconnectAgent("antigravity", root);
    expect(result.ok).toBe(true);
    expect(result.output).toContain("AGENTS.md block retained for another connected host");
  });
});

describe("install reconciles the destination instead of overlaying it", () => {
  it("prunes a skill the roster recorded but the bundle no longer ships", async () => {
    const root = await tempRoot();
    const bundle = join(root, "bundle");
    const dest = join(root, ".agents", "skills");
    await writeTree(bundle, { "kanmer-plan/SKILL.md": "new plan\n" });
    await writeTree(dest, {
      "kanmer-plan/SKILL.md": "old plan\n",
      "kanmer-retired/SKILL.md": "retired\n",
      "mycompany-review/note.txt": "keep exactly\n",
      "user.txt": "also keep\n",
      ".kanmer-skills-version": "0.1.0\nskills:\nkanmer-plan\nkanmer-retired\n",
    });

    const result = await reconcileSkills(dest, bundle, "0.2.0");

    expect(result.removed).toEqual(["kanmer-retired"]);
    expect(result.replaced).toEqual(["kanmer-plan"]);
    expect(result.installed).toEqual([]);
    await missing(dest, "kanmer-retired", "SKILL.md");
    await expect(readFile(join(dest, "kanmer-plan", "SKILL.md"), "utf8")).resolves.toBe("new plan\n");
    // The invariant this ticket must strengthen, not weaken, while gaining the
    // power to delete: a skill Kanmer did not write is untouched.
    await expect(readFile(join(dest, "mycompany-review", "note.txt"), "utf8")).resolves.toBe("keep exactly\n");
    await expect(readFile(join(dest, "user.txt"), "utf8")).resolves.toBe("also keep\n");
  });

  it("replaces an owned folder wholesale, so a file the bundle dropped cannot outlive it", async () => {
    // The second shape of retirement: impact-template.md was renamed inside a
    // folder that survived, and a merging `cp` leaves the old name behind.
    const root = await tempRoot();
    const bundle = join(root, "bundle");
    const dest = join(root, ".agents", "skills");
    await writeTree(bundle, { "kanmer-research/assets/files-template.md": "files\n" });
    await writeTree(dest, {
      "kanmer-research/assets/impact-template.md": "stale\n",
      "kanmer-research/SKILL.md": "old\n",
      ".kanmer-skills-version": "0.1.0\nskills:\nkanmer-research\n",
    });

    await reconcileSkills(dest, bundle, "0.2.0");

    await missing(dest, "kanmer-research", "assets", "impact-template.md");
    await missing(dest, "kanmer-research", "SKILL.md");
    await expect(
      readFile(join(dest, "kanmer-research", "assets", "files-template.md"), "utf8"),
    ).resolves.toBe("files\n");
  });

  it("reports a first install as installed, not as replaced — nothing could have been lost", async () => {
    const root = await tempRoot();
    const bundle = join(root, "bundle");
    const dest = join(root, ".grok", "skills");
    await writeTree(bundle, { "kanmer-plan/SKILL.md": "plan\n" });

    const result = await reconcileSkills(dest, bundle, "0.2.0");

    expect(result).toEqual({ installed: ["kanmer-plan"], replaced: [], removed: [] });
  });

  it("stamps the roster it just wrote, version first", async () => {
    const root = await tempRoot();
    const bundle = join(root, "bundle");
    const dest = join(root, ".grok", "skills");
    await writeTree(bundle, { "kanmer-plan/SKILL.md": "p\n", "kanmer-auto/SKILL.md": "a\n" });

    await reconcileSkills(dest, bundle, "0.2.0");

    expect(await readFile(join(dest, ".kanmer-skills-version"), "utf8")).toBe(
      "0.2.0\nskills:\nkanmer-auto\nkanmer-plan\n",
    );
  });

  it("deletes nothing it cannot account for when the stamp predates the roster", async () => {
    const root = await tempRoot();
    const bundle = join(root, "bundle");
    const dest = join(root, ".agents", "skills");
    await writeTree(bundle, { "kanmer-plan/SKILL.md": "plan\n" });
    await writeTree(dest, {
      "kanmer-unknown/SKILL.md": "not in the bundle, not tombstoned\n",
      ".kanmer-skills-version": "0.1.0\n",
    });

    const result = await reconcileSkills(dest, bundle, "0.2.0");

    expect(result.removed).toEqual([]);
    await expect(readFile(join(dest, "kanmer-unknown", "SKILL.md"), "utf8")).resolves.toBe(
      "not in the bundle, not tombstoned\n",
    );
  });

  it("repairs a pre-roster install through the closed tombstone list", async () => {
    // Neither residue is recoverable from the roster — both retired before it
    // existed — so the two shipped tombstones are what cleans them up.
    const root = await tempRoot();
    const bundle = join(root, "bundle");
    const dest = join(root, ".agents", "skills");
    await writeTree(bundle, { "kanmer-plan/SKILL.md": "plan\n" });
    await writeTree(dest, {
      "kanmer-import/SKILL.md": "folded into kanmer-setup\n",
      "kanmer-research/assets/impact-template.md": "renamed to files-template\n",
      "kanmer-research/assets/files-template.md": "current\n",
      "mycompany-review/note.txt": "keep exactly\n",
      ".kanmer-skills-version": "0.1.0\n",
    });

    const result = await reconcileSkills(dest, bundle, "0.2.0");

    expect(result.removed).toEqual(["kanmer-import", "kanmer-research/assets/impact-template.md"]);
    await missing(dest, "kanmer-import", "SKILL.md");
    await missing(dest, "kanmer-research", "assets", "impact-template.md");
    await expect(
      readFile(join(dest, "kanmer-research", "assets", "files-template.md"), "utf8"),
    ).resolves.toBe("current\n");
    await expect(readFile(join(dest, "mycompany-review", "note.txt"), "utf8")).resolves.toBe("keep exactly\n");
  });

  it("refuses to follow a roster entry that would escape the destination", async () => {
    const root = await tempRoot();
    const bundle = join(root, "bundle");
    const dest = join(root, ".agents", "skills");
    await writeTree(bundle, { "kanmer-plan/SKILL.md": "plan\n" });
    await writeTree(root, { "outside.txt": "must survive\n" });
    await writeTree(dest, { ".kanmer-skills-version": "0.1.0\nskills:\n..\n../..\nsub/dir\n" });

    await reconcileSkills(dest, bundle, "0.2.0");

    await expect(readFile(join(root, "outside.txt"), "utf8")).resolves.toBe("must survive\n");
  });
});

describe("disconnect removes what Kanmer wrote, not what it currently ships", () => {
  it("removes a roster-recorded skill the bundle has since retired", async () => {
    const root = await tempRoot();
    const bundle = join(root, "bundle");
    const dest = join(root, ".grok", "skills");
    await writeTree(bundle, { "kanmer-plan/SKILL.md": "plan\n" });
    await writeTree(dest, {
      "kanmer-plan/SKILL.md": "plan\n",
      "kanmer-retired/SKILL.md": "retired\n",
      "mycompany-review/note.txt": "keep exactly\n",
      ".kanmer-skills-version": "0.1.0\nskills:\nkanmer-plan\nkanmer-retired\n",
    });

    await removeBundledSkillsOnly(root, ".grok/skills", bundle);

    await missing(dest, "kanmer-retired", "SKILL.md");
    await missing(dest, "kanmer-plan", "SKILL.md");
    await missing(dest, ".kanmer-skills-version");
    await expect(readFile(join(dest, "mycompany-review", "note.txt"), "utf8")).resolves.toBe("keep exactly\n");
  });
});

describe("disconnect and the shared .agents/skills directory", () => {
  const roster = "0.1.0\nskills:\nkanmer-plan\n";

  it("keeps the copied skills while a host writing the same directory is still connected", async () => {
    const root = await tempRoot();
    await writeTree(root, {
      "opencode.json": JSON.stringify({ mcp: { kanmer: {} } }),
      ".agents/mcp_config.json": JSON.stringify({ mcpServers: { kanmer: {} } }),
      ".agents/skills/kanmer-plan/SKILL.md": "plan\n",
      ".agents/skills/.kanmer-skills-version": roster,
    });

    const result = await disconnectAgent("opencode", root);

    expect(result.ok).toBe(true);
    expect(result.output).toContain("copied skills retained in .agents/skills");
    await expect(
      readFile(join(root, ".agents", "skills", "kanmer-plan", "SKILL.md"), "utf8"),
    ).resolves.toBe("plan\n");
  });

  it("removes them when the only other connected host writes a different directory", async () => {
    const root = await tempRoot();
    await writeTree(root, {
      "opencode.json": JSON.stringify({ mcp: { kanmer: {} } }),
      ".mcp.json": JSON.stringify({ mcpServers: { kanmer: {} } }), // grok → .grok/skills
      ".agents/skills/kanmer-plan/SKILL.md": "plan\n",
      ".agents/skills/.kanmer-skills-version": roster,
    });

    const result = await disconnectAgent("opencode", root);

    expect(result.ok).toBe(true);
    expect(result.output).toContain("bundled copied skills removed");
    await missing(root, ".agents", "skills", "kanmer-plan", "SKILL.md");
  });
});
