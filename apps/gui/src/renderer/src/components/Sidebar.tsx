import type { BoardConfig } from "@kanmer/core";
import { columnColor } from "../lib/board.js";
import { SCOPES, type Scope } from "../lib/scopes.js";

/**
 * Line-art glyphs from the approved reference (`prototype.js` `PATHS`), inlined
 * rather than imported: the renderer takes no new dependency, and four paths do
 * not justify one. Every glyph is `aria-hidden` — the accessible name always
 * comes from the button's own text or `aria-label`, so the rail reads the same
 * expanded, collapsed, or to a screen reader that renders no SVG at all.
 */
const GLYPHS: Record<string, string> = {
  board: "M3 4h18v16H3zM9 4v16M15 4v16",
  list: "M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01",
  inbox: "M4 4h16l2 11v5H2v-5L4 4zM2 15h6l2 3h4l2-3h6",
  check: "M5 12l4 4L19 6",
  archive: "M3 3h18v5H3zM5 8v13h14V8M9 12h6",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  folder: "M3 6V4h6l2 3h10v13H3V6z",
  people: "M8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6M2 21v-4a6 6 0 0 1 12 0v4M16 4a3 3 0 0 1 0 6M18 13a5 5 0 0 1 4 5v3",
  left: "M15 5l-7 7 7 7",
  chevron: "M9 5l7 7-7 7",
};

const SCOPE_GLYPH: Record<Scope, string> = {
  active: "board",
  all: "list",
  backlog: "inbox",
  done: "check",
  archived: "archive",
};

function Glyph({ name }: { name: string }): JSX.Element {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={GLYPHS[name]} />
    </svg>
  );
}

interface SidebarProps {
  board: BoardConfig;
  /** The project's display name, shown at the top of the rail. */
  projectName: string;
  /** Every scope's unfiltered count — a badge, so it ignores search and filters. */
  counts: Record<Scope, number>;
  scope: Scope;
  onScope: (scope: Scope) => void;
  /** The active area filter: `undefined` = all areas, `""` = tickets with no area. */
  area: string | undefined;
  onArea: (area: string | undefined) => void;
  /** True while the Standup view is showing, so the rail can mark it current. */
  standupActive: boolean;
  onStandup: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

/**
 * The Focus Board's navigation rail (FRD-036 R7).
 *
 * Two lists and an exit. **Workspace** selects a scope — which slice of the
 * project is on screen — and shows how much each holds. **Areas** sets the same
 * `filters.area` the FilterBar sets, through the same callback, so the two
 * controls cannot disagree about what is filtered. **Standup** leaves the board
 * for the existing report.
 *
 * Structure is semantic on purpose: a `<nav>` holding `<ul>`s of `<button>`s,
 * each list labelled by its own heading. That gives a screen reader "Workspace,
 * list, 5 items" for free and makes the whole rail tabbable without a single
 * key handler of our own — arrow-key roving focus would *reduce* what works
 * here, because a list of buttons is already navigable.
 *
 * `aria-current="page"` marks the active scope (and Standup while it is
 * showing). The counts are badges: they count what the scope holds and ignore
 * the active search and filters, exactly as a tab badge does (FRD-019 R5a) —
 * the board's column counts answer the other question.
 */
export function Sidebar({
  board,
  projectName,
  counts,
  scope,
  onScope,
  area,
  onArea,
  standupActive,
  onStandup,
  collapsed,
  onCollapsedChange,
}: SidebarProps): JSX.Element {
  // A ticket may sit in an area the board no longer declares; the FilterBar
  // offers those too, so the rail lists exactly the declared areas plus the
  // "No area" bucket and leaves the long tail to the filter dropdown.
  const areas = board.areas ?? [];

  return (
    <nav className={collapsed ? "sidebar collapsed" : "sidebar"} aria-label="Board navigation">
      <div className="sidebar-head">
        {!collapsed && (
          <span className="sidebar-project" title={projectName}>
            {projectName}
          </span>
        )}
        <button
          type="button"
          className="ghost xs sidebar-toggle"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          <Glyph name={collapsed ? "chevron" : "left"} />
        </button>
      </div>

      <h2 className="nav-caption" id="nav-workspace">
        Workspace
      </h2>
      <ul className="nav-list" aria-labelledby="nav-workspace">
        {SCOPES.map((spec) => {
          const active = spec.id === scope && !standupActive;
          return (
            <li key={spec.id}>
              <button
                type="button"
                className={active ? "nav-item active" : "nav-item"}
                aria-current={active ? "page" : undefined}
                title={`${spec.label} — ${spec.description}`}
                onClick={() => onScope(spec.id)}
              >
                <Glyph name={SCOPE_GLYPH[spec.id]} />
                <span className="nav-label">{spec.label}</span>
                <span className="nav-count">{counts[spec.id]}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <h2 className="nav-caption" id="nav-areas">
        Areas
      </h2>
      <ul className="nav-list" aria-labelledby="nav-areas">
        <li>
          <button
            type="button"
            className={area === undefined ? "nav-item active" : "nav-item"}
            aria-current={area === undefined ? "page" : undefined}
            onClick={() => onArea(undefined)}
          >
            <Glyph name="grid" />
            <span className="nav-label">All areas</span>
          </button>
        </li>
        {areas.map((a) => {
          const active = area === a.id;
          const color = columnColor(areas, a.id);
          return (
            <li key={a.id}>
              <button
                type="button"
                className={active ? "nav-item active" : "nav-item"}
                aria-current={active ? "page" : undefined}
                title={a.name || a.id}
                onClick={() => onArea(a.id)}
              >
                {/* Colour is decoration, never the only cue: the name is the
                    label and `aria-current` carries the state. */}
                <span
                  className="nav-dot"
                  aria-hidden="true"
                  style={color ? { background: color } : undefined}
                />
                <span className="nav-label">{a.name || a.id}</span>
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            className={area === "" ? "nav-item active" : "nav-item"}
            aria-current={area === "" ? "page" : undefined}
            onClick={() => onArea("")}
          >
            <Glyph name="folder" />
            <span className="nav-label">No area</span>
          </button>
        </li>
      </ul>

      <div className="sidebar-bottom">
        <button
          type="button"
          className={standupActive ? "nav-item active" : "nav-item"}
          aria-current={standupActive ? "page" : undefined}
          onClick={onStandup}
        >
          <Glyph name="people" />
          <span className="nav-label">Standup</span>
        </button>
      </div>
    </nav>
  );
}
