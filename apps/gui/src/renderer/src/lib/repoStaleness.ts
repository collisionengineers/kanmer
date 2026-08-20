import type { RepoStaleness } from "@kanmer/core";

/** Only `behind` rows deserve an attention banner; the other states are informational. */
export function needsStalenessAttention(report: RepoStaleness | null): boolean {
  return report !== null && !report.upToDate;
}
