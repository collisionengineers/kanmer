import type { BoardConfig, Item } from "@kanmer/core";
import { distinct } from "../lib/board.js";

export interface Filters {
  area?: string; // undefined = all, "" = no area, else area id
  priority?: string;
  assignee?: string;
  label?: string;
}

interface FilterBarProps {
  board: BoardConfig;
  items: Item[]; // current view items (unfiltered), for option lists
  search: string;
  onSearch: (q: string) => void;
  filters: Filters;
  onFilters: (f: Filters) => void;
  searchRef?: React.RefObject<HTMLInputElement>;
}

export function FilterBar({
  board,
  items,
  search,
  onSearch,
  filters,
  onFilters,
  searchRef,
}: FilterBarProps): JSX.Element {
  const assignees = distinct(items.map((i) => i.assignee));
  const labels = distinct(items.flatMap((i) => i.labels ?? []));
  const set = (patch: Partial<Filters>) => onFilters({ ...filters, ...patch });
  const active =
    !!search ||
    filters.area !== undefined ||
    !!filters.priority ||
    !!filters.assignee ||
    !!filters.label;

  return (
    <div className="filterbar">
      <input
        ref={searchRef}
        className="search"
        type="search"
        placeholder="Search…  (Ctrl+F)"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />

      {board.areas.length > 0 && (
        <select
          value={filters.area ?? "__all__"}
          onChange={(e) =>
            set({ area: e.target.value === "__all__" ? undefined : e.target.value })
          }
        >
          <option value="__all__">All areas</option>
          <option value="">No area</option>
          {board.areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}

      <select
        value={filters.priority ?? ""}
        onChange={(e) => set({ priority: e.target.value || undefined })}
      >
        <option value="">All priorities</option>
        {board.priorities.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {assignees.length > 0 && (
        <select
          value={filters.assignee ?? ""}
          onChange={(e) => set({ assignee: e.target.value || undefined })}
        >
          <option value="">All assignees</option>
          {assignees.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      )}

      {labels.length > 0 && (
        <select
          value={filters.label ?? ""}
          onChange={(e) => set({ label: e.target.value || undefined })}
        >
          <option value="">All labels</option>
          {labels.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      )}

      {active && (
        <button
          className="ghost xs"
          onClick={() => {
            onSearch("");
            onFilters({});
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
