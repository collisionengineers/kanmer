import chokidar, { type FSWatcher } from "chokidar";
import { resolvePaths } from "./paths.js";

export type KanmerChangeEvent = "add" | "change" | "unlink";

export interface WatchHandle {
  close: () => Promise<void>;
}

/**
 * Watch a project's `.kanmer` folder and invoke `onChange` (debounced) whenever
 * an item or the board config changes on disk — e.g. an agent writing through
 * the MCP server while the GUI is open. The GUI subscribes to this.
 */
export function watchKanmer(
  projectRoot: string,
  onChange: (event: KanmerChangeEvent, file: string) => void,
  options: { debounceMs?: number } = {},
): WatchHandle {
  const paths = resolvePaths(projectRoot);
  const debounceMs = options.debounceMs ?? 120;

  const watcher: FSWatcher = chokidar.watch(paths.kanmer, {
    ignoreInitial: true,
    // Ignore the atomic-write temp files (.<name>.tmp-...).
    ignored: /(^|[/\\])\.[^/\\]*\.tmp-/,
    awaitWriteFinish: { stabilityThreshold: 80, pollInterval: 20 },
  });

  let timer: NodeJS.Timeout | null = null;
  // Coalesce per FILE (last event wins per file), not globally — consumers
  // patch state per file now, so a burst touching several files must
  // deliver one event for each, not just the last one.
  const pending = new Map<string, KanmerChangeEvent>();

  const flush = () => {
    const batch = [...pending.entries()];
    pending.clear();
    timer = null;
    for (const [file, event] of batch) onChange(event, file);
  };

  const schedule = (event: KanmerChangeEvent) => (file: string) => {
    pending.set(file, event);
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, debounceMs);
  };

  watcher.on("add", schedule("add"));
  watcher.on("change", schedule("change"));
  watcher.on("unlink", schedule("unlink"));

  return {
    async close() {
      if (timer) clearTimeout(timer);
      await watcher.close();
    },
  };
}
