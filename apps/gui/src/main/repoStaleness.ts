import { detectStaleness, type RepoStaleness } from "@kanmer/core";

/** The narrow store surface a cold GUI staleness read needs. */
export interface RepoStalenessStore {
  paths: Parameters<typeof detectStaleness>[0]["paths"];
  getBoardWithSource(): Promise<{
    board: Parameters<typeof detectStaleness>[0]["board"];
    source: Parameters<typeof detectStaleness>[0]["boardSource"];
  }>;
  detectFormat(): Promise<number>;
}

/**
 * Resolve the same core report MCP returns, using the store's source-repo
 * paths. Kept out of `snapshotOf()` so a board watcher never triggers it.
 */
export async function repoStalenessFor(
  store: RepoStalenessStore,
  bundledSkillsDir: string | null,
): Promise<RepoStaleness> {
  const [{ board, source }, format] = await Promise.all([store.getBoardWithSource(), store.detectFormat()]);
  return detectStaleness({
    paths: store.paths,
    board,
    boardSource: source,
    format,
    bundledSkillsDir,
  });
}
