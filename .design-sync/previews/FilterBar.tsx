import { useState } from "react";
import { FilterBar, demoBoard, demoItems } from "@kanmer/ui";
import type { Filters } from "@kanmer/ui";
import "./frame.module.css";

/** Search plus area / priority / assignee / label selects — option lists come from the board and the current items. */
export const AllFilters = () => {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  return (
    <div style={{ padding: 8 }}>
      <FilterBar board={demoBoard} items={demoItems} search={search} onSearch={setSearch} filters={filters} onFilters={setFilters} />
    </div>
  );
};

/** With a search term and filters applied the Clear button appears. */
export const Active = () => {
  const [search, setSearch] = useState("concurrency");
  const [filters, setFilters] = useState<Filters>({ area: "api", priority: "high", assignee: "mercer" });
  return (
    <div style={{ padding: 8 }}>
      <FilterBar board={demoBoard} items={demoItems} search={search} onSearch={setSearch} filters={filters} onFilters={setFilters} />
    </div>
  );
};

const noAreas = { ...demoBoard, areas: [] };
const bare = demoItems.map((i) => ({ ...i, assignee: "", labels: [] }));

/** A board without areas, assignees or labels collapses to search + priority. */
export const Minimal = () => {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({});
  return (
    <div style={{ padding: 8 }}>
      <FilterBar board={noAreas} items={bare} search={search} onSearch={setSearch} filters={filters} onFilters={setFilters} />
    </div>
  );
};
