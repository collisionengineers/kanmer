import type { DocType } from "@kanmer/core";

/** The configured document whose Markdown checkboxes represent ticket progress. */
export function progressDocId(types: DocType[]): string | undefined {
  return types.find((type) => type.progress)?.id;
}
