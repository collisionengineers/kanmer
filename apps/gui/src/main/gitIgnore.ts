// Append-only `.gitignore` maintenance shared by the board machinery
// (`kanmerGit.ts`: `.kanmer/`, `.worktrees/`) and Connect (`connect.ts`: the
// per-machine registration files and copied skills a host reads; FRD-012 R1c).
import { appendFile, lstat, readFile } from "node:fs/promises";

/** The managed rules `before` does not already carry in effect. */
export function ignoreEntriesToAppend(before: string, entries: string[]): string[] {
  const lines = before.replace(/\r\n/g, "\n").split("\n").filter(Boolean);
  // Append-only is the compare-and-swap boundary: existing lines are never
  // rewritten from a stale snapshot. A managed rule is needed when absent or
  // when a later negation may have made its earlier copy ineffective.
  return entries.filter((entry) => {
    const last = lines.lastIndexOf(entry);
    return last < 0 || lines.slice(last + 1).some((line) => line.startsWith("!"));
  });
}

/**
 * Ensure `file` carries every entry, appending only what is missing. Returns
 * the entries appended, so a caller can say what it did (or that it did nothing).
 */
export async function ensureIgnore(file: string, entries: string[]): Promise<string[]> {
  let stat;
  try {
    stat = await lstat(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (stat?.isSymbolicLink()) throw new Error(`Refusing symlinked ignore path: ${file}`);
  const before = stat ? await readFile(file, "utf8") : "";
  const append = ignoreEntriesToAppend(before, entries);
  if (append.length === 0) return [];
  // O_APPEND makes the merge one kernel append operation. Any concurrent
  // human/process lines remain in place, including edits made in the old
  // compare/write window; the next reconciliation can append again if a new
  // negation arrives after these managed rules.
  const prefix = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
  await appendFile(file, `${prefix}${append.join("\n")}\n`, { encoding: "utf8", flag: "a" });
  return append;
}
