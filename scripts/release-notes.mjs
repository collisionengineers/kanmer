#!/usr/bin/env node
/**
 * Draft release notes from tickets that reached Done since the last tag.
 *
 * This is the first thing that makes `stageEntered` *useful* rather than merely
 * recorded — which is a better argument for the operating rule (AGENTS.md §0)
 * than any amount of prose about following it.
 *
 *   node scripts/release-notes.mjs [--since <tag|ISO date>]
 *
 * **Read-only.** It prints to stdout and writes nothing. Release notes get
 * edited by a person before they ship, and a script that wrote the file
 * directly would invite shipping the raw dump.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function git(args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function repositoryUrl() {
  const remote = git(["remote", "get-url", "origin"]);
  if (!remote) return "";
  return remote
    .replace(/^git@([^:]+):/, "https://$1/")
    .replace(/\.git$/, "")
    .replace(/\/$/, "");
}

const originUrl = repositoryUrl();

function pullRequestUrl(value) {
  const reference = String(value).trim();
  if (/^https?:\/\//i.test(reference)) return reference;
  const number = reference.match(/^#?(\d+)$/)?.[1];
  return number && originUrl ? `${originUrl}/pull/${number}` : reference;
}

/** The cut-off: an explicit `--since`, else the last tag's date, else all time. */
function resolveSince() {
  const flag = process.argv.indexOf("--since");
  if (flag !== -1 && process.argv[flag + 1]) {
    const raw = process.argv[flag + 1];
    const asDate = new Date(raw);
    if (!Number.isNaN(asDate.getTime())) return { iso: asDate.toISOString(), label: raw };
    const tagged = git(["log", "-1", "--format=%cI", raw]);
    if (tagged) return { iso: tagged, label: raw };
    throw new Error(`--since "${raw}" is neither a date nor a known tag`);
  }
  const tag = git(["describe", "--tags", "--abbrev=0"]);
  if (!tag) return { iso: "1970-01-01T00:00:00.000Z", label: "the beginning" };
  return { iso: git(["log", "-1", "--format=%cI", tag]), label: tag };
}

/**
 * The board lives at the *main* checkout's `.worktrees/kanmer`, which is not
 * `root` when this runs from a per-ticket worktree — and running it from one is
 * the normal case, since that is where the work happens.
 *
 * `--git-common-dir` resolves to the shared `.git` for every worktree, so its
 * parent is the main checkout wherever this is invoked from.
 */
function mainCheckout() {
  const common = git(["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  return common ? dirname(common) : root;
}

const boardRoot = join(mainCheckout(), ".worktrees", "kanmer");
if (!existsSync(join(boardRoot, ".kanmer"))) {
  console.error(`No board at ${boardRoot} — nothing to draft from.`);
  process.exit(1);
}

const { KanmerStore } = await import(
  new URL("../packages/core/dist/index.js", import.meta.url).href
);
const store = new KanmerStore(boardRoot, { repoRoot: root });
const since = resolveSince();

const all = await store.listItems({ includeArchived: true });
const shipped = all.filter((i) => {
  const done = i.stageEntered?.done;
  // No `done` stamp means it predates CORE-011 (or was never moved through the
  // board). Excluded rather than guessed at from `updated`, which changes for
  // any edit and would sweep in tickets that shipped long ago.
  return done !== undefined && done > since.iso && i.status === "done";
});

const byArea = new Map();
for (const i of shipped) {
  const list = byArea.get(i.area) ?? [];
  list.push(i);
  byArea.set(i.area, list);
}

const lines = [`## Since ${since.label}`, ""];
if (shipped.length === 0) {
  lines.push("_No tickets have reached Done since then._");
} else {
  for (const area of [...byArea.keys()].sort()) {
    lines.push(`### ${area}`, "");
    for (const i of byArea.get(area).sort((a, b) => a.id.localeCompare(b.id))) {
      const pr = (i.prs ?? [])[0];
      const href = pr ? pullRequestUrl(pr) : "";
      const link = href ? ` ([PR](${href}))` : "";
      lines.push(`- **${i.id}** ${i.title}${link}`);
    }
    lines.push("");
  }
  lines.push(
    `_${shipped.length} ticket${shipped.length === 1 ? "" : "s"} across ` +
      `${byArea.size} area${byArea.size === 1 ? "" : "s"}. Draft — edit before shipping._`,
  );
}

console.log(lines.join("\n"));
