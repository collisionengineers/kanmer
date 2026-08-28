// The "Update skills" affordance, checked against the REAL bundled plugin
// manifest rather than a fixture.
//
// Why this file exists separately from connect.test.ts: that suite mocks
// `getAppPath` to "/unused" on purpose, so `pluginRoot()` there points at
// nothing. The bug this guards is precisely that the real
// plugins/kanmer/.claude-plugin/plugin.json drifted away from the repo version,
// which a fixture cannot see. So here `getAppPath` is pointed at the real
// apps/gui directory and `bundledSkillsVersion()` reads the file that ships.
//
// MCP-011. Before this ticket both plugin manifests said 0.1.0 while the repo
// said 0.3.2, and `installSkills` stamps a copy with that same constant — so
// installed and bundled were written from one number and
// `isNewerVersion(bundled, installed)` could never be true. The button in
// Settings.tsx is rendered only when `updateAvailable` is true, which made
// GUI-080's merged reconciliation unreachable by construction.
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { removeTreeWithRetry } from "@kanmer/core";

// <repo>/apps/gui/src/main/ → <repo>/apps/gui, which is what `app.getAppPath()`
// returns in development; `pluginRoot()` walks two levels up from it.
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const repoRoot = resolve(appDir, "..", "..");

vi.mock("electron", () => ({
  app: { isPackaged: false, getAppPath: () => appDir },
}));

const { skillsStatus } = await import("./connect.js");
const { SKILLS_VERSION_FILE, formatSkillsStamp } = await import("./providers.js");

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => removeTreeWithRetry(root)));
});

async function projectWithStamp(version: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "kanmer-skills-version-"));
  roots.push(root);
  const dir = join(root, ".grok", "skills");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, SKILLS_VERSION_FILE), formatSkillsStamp(version, ["kanmer-plan"]));
  return root;
}

async function repoVersion(): Promise<string> {
  const pkg = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8")) as {
    version: string;
  };
  return pkg.version;
}

describe("the bundled skills version comes from the shipped plugin manifest", () => {
  it("equals the repo version, so an update can ever be offered", async () => {
    const status = await skillsStatus("grok", await projectWithStamp("0.0.1"));
    expect(status.bundledVersion).toBe(await repoVersion());
  });

  it("reports Grok's native plugin rather than a project copy", async () => {
    const status = await skillsStatus("grok", await projectWithStamp("0.0.1"));
    expect(status.scope).toBe("plugin");
    expect(status.installedVersion).toBeNull();
    expect(status.updateAvailable).toBe(false);
  });

  it("offers nothing for the native plugin", async () => {
    const status = await skillsStatus("grok", await projectWithStamp(await repoVersion()));
    expect(status.updateAvailable).toBe(false);
  });
});
