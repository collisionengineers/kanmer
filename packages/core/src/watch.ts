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
  let pending: { event: KanmerChangeEvent; file: string } | null = null;

  const flush = () => {
    if (pending) onChange(pending.event, pending.file);
    pending = null;
    timer = null;
  };

  const schedule = (event: KanmerChangeEvent) => (file: string) => {
    pending = { event, file };
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
