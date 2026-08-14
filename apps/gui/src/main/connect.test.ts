import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({ app: { isPackaged: false, getAppPath: () => "/unused" } }));

const { disconnectAgent, removeBundledSkillsOnly } = await import("./connect.js");
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

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
