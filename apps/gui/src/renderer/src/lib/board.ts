import type { BoardColumn } from "@kanmer/core";

/** Find a column by id. */
export function findColumn(cols: BoardColumn[], id: string): BoardColumn | undefined {
  return cols.find((c) => c.id === id);
}

/** A column's display name, falling back to its id. */
export function columnName(cols: BoardColumn[], id: string): string {
  return findColumn(cols, id)?.name ?? id;
}

/** A column's colour, if configured. */
export function columnColor(cols: BoardColumn[], id: string): string | undefined {
  return findColumn(cols, id)?.color;
}

/** Distinct non-empty values of a field across items, sorted. */
export function distinct(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))].sort();
}
