import { memo, useCallback, useRef, useState } from "react";
import { UI_STAGES as STAGES, UI_STAGE_IDS, uiStageName as stageName } from "../../../shared/stages.js";
import type { BoardConfig, CreateItemInput, Item, MovePosition } from "@kanmer/core";
import { columnColor, columnCards, mergeColumns, positionForDrop } from "../lib/board.js";
import { PAGE_SIZE, pageColumn } from "../lib/paging.js";
import { primaryGroup, stagesForScope, type Scope } from "../lib/scopes.js";
import { useClient } from "../lib/client.js";
import { QuickAdd } from "./QuickAdd.js";

interface BoardProps {
  board: BoardConfig;
  items: Item[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, to: BoardMove) => void;
  /** Keyboard drag equivalent: move one stage left (-1) or right (+1). */
  onMoveRelative: (id: string, dir: -1 | 1) => void;
  onQuickAdd: (input: CreateItemInput) => void;
  /** Native right-click menu for a card. */
  onContext: (item: Item, x: number, y: number) => void;
  /** Ids with a live blocker — computed once in App, read per card as a boolean. */
  blocked: Set<string>;
  /** Click a group chip to filter every view to it. */
  onFilterGroup: (groupId: string) => void;
  /** Ids with a background agent dispatch in flight. */
  dispatching?: Set<string>;
  /** Card density preference (Phase 4.4): "compact" tightens padding/gaps. */
  density?: "comfortable" | "compact";
  /** Which stage columns to render (FRD-036 R1). */
  scope: Scope;
  /** Column id → 1-based page. Absent means page 1. */
  pages: Record<string, number>;
  onPage: (columnId: string, page: number) => void;
  /** Announce a refused interaction, so the reason is not only visual. */
  onAnnounce?: (message: string) => void;
}

export interface BoardMove {
  status: string;
  position?: MovePosition;
  /** Client coordinates from a drag drop; keyboard/menu moves omit this. */
  anchor?: { x: number; y: number };
}

interface AreaGroup {
  id: string; // "" for no area
  name: string;
  color?: string;
  cards: Item[];
}

/** Which half of a card the pointer is over. */
function edgeOf(el: HTMLElement, clientY: number): "before" | "after" {
  const r = el.getBoundingClientRect();
  return clientY < r.top + r.height / 2 ? "before" : "after";
}

/**
 * The board is a row of workflow-stage columns (statuses), limited to the ones
 * the active scope renders. Within each column, cards cluster by area under a
 * colour-coded sub-header — areas group related work without adding a second
 * workflow dimension — and only `PAGE_SIZE` of them are visible at once.
 *
 * ## Paging changes what is rendered and nothing else
 *
 * `order` is a **column-wide** key (AGENTS.md §8 gotcha 9): `computeOrder`
 * filters on status alone while this component renders grouped by area *and*
 * sliced by page. Every drop neighbour therefore still comes from
 * `columnCards(itemsRef.current, statusId)` — the whole sorted column — exactly
 * as it did before paging existed. A visible card's "before"/"after" resolves
 * against the full column, so dropping at the top of page 3 correctly means
 * "after the last card of page 2" rather than "top of the column".
 *
 * The one drop that paging genuinely breaks is the whole-cell fallback, which
 * means "bottom of the column". On a paged column that is a position the user
 * cannot see, so the card would vanish from the page they are looking at with
 * no indication of where it went. That drop is refused with a visible reason
 * unless the last page is showing; the context menu's "Move to ▸" remains the
 * unbounded route, and the pager reaches the rest of the column.
 */
export function Board(props: BoardProps): JSX.Element {
  const {
    board,
    items,
    selectedId,
    onSelect,
    onMove,
    onMoveRelative,
    onQuickAdd,
    onContext,
    onFilterGroup,
    blocked,
    dispatching,
    density,
    scope,
    pages,
    onPage,
    onAnnounce,
  } = props;
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<{ id: string; edge: "before" | "after" } | null>(null);
  // Why a drop was refused, per column — shown in that column's pager row.
  const [refused, setRefused] = useState<{ column: string; reason: string } | null>(null);
  // During a drag, which stages the dragged ticket can't enter (→ lock tint).
  const client = useClient();
  const [gated, setGated] = useState<Record<string, string[]> | null>(null);
  const onDragBegin = useCallback(
    (id: string) => {
      void client.getGateStatus(id).then(setGated);
    },
    [client],
  );
  // Clear the tint when the drag ends anywhere (drop, cancel, or off-board).
  const onDragFinish = useCallback(() => setGated(null), []);

  // The drop handlers must see the current items without being rebuilt when
  // items change: a fresh callback identity would re-render every memoized
  // Card on every board change, which is exactly what Phase 7.5 removed.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const onCardDragOver = useCallback((statusId: string, id: string, edge: "before" | "after") => {
    setDropHint((h) => (h && h.id === id && h.edge === edge ? h : { id, edge }));
    setDropTarget(statusId); // the card swallowed the cell's dragover
  }, []);

  const onCardDragLeave = useCallback((id: string) => {
    setDropHint((h) => (h?.id === id ? null : h));
  }, []);

  const onCardDrop = useCallback(
    (
      statusId: string,
      targetId: string,
      edge: "before" | "after",
      dragged: string,
      anchor: { x: number; y: number },
    ) => {
      setDropHint(null);
      setDropTarget(null);
      setRefused(null);
      if (!dragged) return;
      // COLUMN-scoped, never the rendered area group and never the visible
      // page: `order` is a column-wide key while the board renders grouped and
      // paged, so neighbours must come from the whole column.
      const column = columnCards(itemsRef.current, statusId);
      onMove(dragged, {
        status: statusId,
        position: positionForDrop(column, targetId, edge, dragged),
        anchor,
      });
    },
    [onMove],
  );

  // The rendered columns. `UI_STAGE_IDS` stays `mergeColumns`' `known`
  // argument, so a stage this scope deliberately leaves out cannot come back as
  // a trailing unknown-status fallback column (GUI-069).
  const rendered = stagesForScope(scope);
  const statuses = mergeColumns(
    STAGES.filter((s) => rendered.includes(s.id)).map((s) => ({ id: s.id, name: s.name, color: s.color })),
    items.map((i) => i.status),
    UI_STAGE_IDS,
  );
  const usingAreas = board.areas.length > 0 || items.some((i) => i.area);

  function groupByArea(cards: Item[]): AreaGroup[] {
    if (!usingAreas) return cards.length ? [{ id: "", name: "", cards }] : [];
    const order = [...board.areas.map((a) => a.id)];
    for (const c of cards) if (c.area && !order.includes(c.area)) order.push(c.area);
    order.push(""); // No area bucket, last
    return order
      .map((areaId) => ({
        id: areaId,
        name: areaId ? board.areas.find((a) => a.id === areaId)?.name ?? areaId : "No area",
        color: columnColor(board.areas, areaId),
        cards: cards.filter((c) => (c.area || "") === areaId),
      }))
      .filter((g) => g.cards.length > 0);
  }

  return (
    <div
      className={density === "compact" ? "board compact" : "board"}
      style={{ gridTemplateColumns: `repeat(${statuses.length}, minmax(230px, 1fr))` }}
    >
      {statuses.map((status) => {
        // One sorted column feeds the rendering, the pager and the drop maths,
        // so the insertion line, the printed range and the computed neighbour
        // can never disagree. The column arrives already scoped, filtered and
        // sorted; paging is strictly last (FRD-036 R2).
        const all = columnCards(items, status.id);
        const page = pageColumn(all, pages[status.id] ?? 1);
        const groups = groupByArea(page.cards);
        const lastPage = page.page === page.pageCount;
        return (
          <section
            key={status.id}
            className="board-column"
            aria-label={`${status.name} column`}
          >
            <div className="col-head">
              <span
                className="col-dot"
                aria-hidden="true"
                style={status.color ? { background: status.color } : undefined}
              />
              {status.name}
              {/* The FILTERED total for this column — a different question from
                  the rail's scope count, which ignores filters (FRD-019 R5b). */}
              <span className="col-count">{page.total || ""}</span>
            </div>
            <div
              className={[
                dropTarget === status.id ? "cell drop" : "cell",
                gated?.[status.id]?.length ? "gated" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              title={gated?.[status.id]?.length ? `Gated: ${gated[status.id].join("; ")}` : undefined}
              onDragOver={(e) => {
                e.preventDefault();
                setDropTarget(status.id);
                setDropHint(null);
              }}
              onDragLeave={() => setDropTarget((t) => (t === status.id ? null : t))}
              onDrop={(e) => {
                // Empty column space: the whole-cell fallback, which means
                // "bottom of the column". On a paged column that is off-screen,
                // so it is refused rather than silently moving a card to a page
                // the user is not looking at.
                e.preventDefault();
                setDropTarget(null);
                setDropHint(null);
                setGated(null);
                const id = e.dataTransfer.getData("text/plain");
                if (!id) return;
                if (!lastPage) {
                  const reason = `${id} was not moved: dropping here means the bottom of ${status.name}, which is on page ${page.pageCount}. Go to the last page, drop beside a card you can see, or use the card's right-click menu.`;
                  setRefused({ column: status.id, reason });
                  onAnnounce?.(reason);
                  return;
                }
                setRefused(null);
                onMove(id, {
                  status: status.id,
                  position: "bottom",
                  anchor: { x: e.clientX, y: e.clientY },
                });
              }}
            >
              {groups.map((group) => (
                <div key={group.id || "__none__"} className="area-group">
                  {usingAreas && (
                    <div className="area-head">
                      <span
                        className="area-dot"
                        style={group.color ? { background: group.color } : undefined}
                      />
                      {group.name}
                      <span className="area-add">
                        <QuickAdd
                          label=""
                          placeholder={`New in ${group.name}…`}
                          onAdd={(title) =>
                            onQuickAdd({
                              type: "ticket",
                              title,
                              status: status.id,
                              area: group.id,
                            })
                          }
                        />
                      </span>
                    </div>
                  )}
                  {group.cards.map((item) => {
                    const chip = primaryGroup(item.groups);
                    return (
                      <Card
                        key={item.id}
                        item={item}
                        board={board}
                        selected={item.id === selectedId}
                        blocked={blocked.has(item.id)}
                        dispatching={dispatching?.has(item.id) ?? false}
                        dropEdge={dropHint?.id === item.id ? dropHint.edge : null}
                        statusId={status.id}
                        groupChip={chip.chip}
                        groupExtra={chip.extra}
                        onSelect={onSelect}
                        onMoveRelative={onMoveRelative}
                        onContext={onContext}
                        onFilterGroup={onFilterGroup}
                        onCardDragOver={onCardDragOver}
                        onCardDragLeave={onCardDragLeave}
                        onCardDrop={onCardDrop}
                        onDragBegin={onDragBegin}
                        onDragFinish={onDragFinish}
                      />
                    );
                  })}
                </div>
              ))}
              <QuickAdd
                label="card"
                onAdd={(title) => onQuickAdd({ type: "ticket", title, status: status.id })}
              />
            </div>
            {refused?.column === status.id && (
              <p className="col-refused" role="status">
                {refused.reason}
              </p>
            )}
            {/* A display bound, not a WIP limit: the pager is how the rest of
                the column is reached, so it appears only when there is a rest. */}
            {page.total > PAGE_SIZE && (
              <div className="col-pager">
                <span className="col-range">
                  {page.start}–{page.end} of {page.total}
                </span>
                <button
                  type="button"
                  className="ghost xs"
                  disabled={page.page === 1}
                  aria-label={`Previous ${status.name} tickets`}
                  onClick={() => onPage(status.id, page.page - 1)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="ghost xs"
                  disabled={lastPage}
                  aria-label={`Next ${status.name} tickets`}
                  onClick={() => onPage(status.id, page.page + 1)}
                >
                  ›
                </button>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/**
 * Memoized: with stable callbacks from App and Board, a drop-target hover or a
 * single item patch re-renders one card, not every card on the board. Every
 * prop here is a primitive or a stable function on purpose — passing the
 * blocked `Set` or the drop-hint object straight in would re-render the whole
 * board on every dragover, and that is also why the group chip arrives as a
 * string plus a number rather than as the ticket's `groups` array.
 */
const Card = memo(function CardInner({
  item,
  board,
  selected,
  blocked,
  dispatching,
  dropEdge,
  statusId,
  groupChip,
  groupExtra,
  onSelect,
  onMoveRelative,
  onContext,
  onFilterGroup,
  onCardDragOver,
  onCardDragLeave,
  onCardDrop,
  onDragBegin,
  onDragFinish,
}: {
  item: Item;
  board: BoardConfig;
  selected: boolean;
  blocked: boolean;
  dispatching: boolean;
  dropEdge: "before" | "after" | null;
  statusId: string;
  /** The one membership the card shows, or null. */
  groupChip: string | null;
  /** How many further memberships the Editor holds. */
  groupExtra: number;
  onSelect: (id: string) => void;
  onMoveRelative: (id: string, dir: -1 | 1) => void;
  onContext: (item: Item, x: number, y: number) => void;
  onFilterGroup: (groupId: string) => void;
  onCardDragOver: (statusId: string, id: string, edge: "before" | "after") => void;
  onCardDragLeave: (id: string) => void;
  onCardDrop: (
    statusId: string,
    targetId: string,
    edge: "before" | "after",
    dragged: string,
    anchor: { x: number; y: number },
  ) => void;
  onDragBegin: (id: string) => void;
  onDragFinish: () => void;
}): JSX.Element {
  const areaColor = columnColor(board.areas, item.area);
  const areaName = item.area
    ? board.areas.find((a) => a.id === item.area)?.name ?? item.area
    : "";
  const stageLabel = stageName(item.status);
  const cls = ["card", selected ? "selected" : "", dropEdge ? `drop-${dropEdge}` : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <article
      className={cls}
      style={areaColor ? { borderLeft: `3px solid ${areaColor}` } : undefined}
      draggable
      tabIndex={0}
      role="button"
      aria-label={`${item.id} ${item.title || "Untitled"}, stage ${stageLabel}${
        areaName ? `, area ${areaName}` : ""
      }${blocked ? ", blocked" : ""}${
        item.deployment && item.deployment !== "n/a" ? `, deployment ${item.deployment}` : ""
      }`}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        onDragBegin(item.id);
      }}
      onDragEnd={() => onDragFinish()}
      onDragOver={(e) => {
        e.preventDefault();
        // Load-bearing: without it the cell's handler also fires and issues a
        // second, position-less move.
        e.stopPropagation();
        onCardDragOver(statusId, item.id, edgeOf(e.currentTarget, e.clientY));
      }}
      onDragLeave={() => onCardDragLeave(item.id)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation(); // same reason as onDragOver
        onCardDrop(
          statusId,
          item.id,
          edgeOf(e.currentTarget, e.clientY),
          e.dataTransfer.getData("text/plain"),
          { x: e.clientX, y: e.clientY },
        );
      }}
      onClick={() => onSelect(item.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        onContext(item, e.clientX, e.clientY);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(item.id);
        } else if ((e.ctrlKey || e.metaKey) && e.key === "ArrowLeft") {
          e.preventDefault();
          onMoveRelative(item.id, -1);
        } else if ((e.ctrlKey || e.metaKey) && e.key === "ArrowRight") {
          e.preventDefault();
          onMoveRelative(item.id, 1);
        }
      }}
    >
      {/* Compact density from the approved reference: a small id line carrying
          only the EXCEPTIONS (blocked, taken, an agent at work, a deployment
          that is not n/a, PRs), then the title as the dominant element, then
          one quiet context line. Ordinary metadata does not get the same
          visual weight as a real blocker. */}
      <div className="card-top">
        <span className="card-id">{item.id}</span>
        {item.taken_at && (
          <span className="chip taken" title={`Taken${item.branch ? ` on ${item.branch}` : ""}`}>
            ⛏ {item.branch ?? "taken"}
          </span>
        )}
        {blocked && (
          <span className="chip blocked" title="Blocked by an unfinished ticket">
            ⛔ blocked
          </span>
        )}
        {dispatching && (
          <span className="chip dispatch" title="A background agent is working this ticket">
            ⏳ agent
          </span>
        )}
        {item.deployment && item.deployment !== "n/a" && (
          <span
            className={item.deployment === "not-deployed" ? "chip deploy off" : "chip deploy"}
            title={`Deployment: ${item.deployment}`}
          >
            🚀 {item.deployment}
          </span>
        )}
        {(item.prs?.length ?? 0) > 0 && (
          <span className="chip pr" title={`${item.prs!.length} PR(s)`}>
            ⇅ {item.prs!.length}
          </span>
        )}
      </div>
      <div className="card-title">{item.title || "Untitled"}</div>
      <div className="card-context">
        {areaName && <span className="card-area">{areaName}</span>}
        {/* One group chip and a count of the rest. Membership is many-to-many
            and nothing is dropped from the data — the Editor shows the full
            list, and "+N" is what says this card is showing a subset. */}
        {groupChip && (
          <button
            type="button"
            className="chip group"
            title={`Filter to ${groupChip}`}
            onClick={(e) => {
              e.stopPropagation(); // the card's own onClick would also select it
              onFilterGroup(groupChip);
            }}
          >
            {groupChip}
          </button>
        )}
        {groupExtra > 0 && (
          <span
            className="chip more"
            title={`In ${groupExtra} more group${groupExtra === 1 ? "" : "s"} — open the ticket to see them all`}
          >
            +{groupExtra}
          </span>
        )}
        {item.assignee && <span className="card-assignee">@{item.assignee}</span>}
      </div>
      {/* Labels stay. Compacting the card is a density change, not a licence to
          drop information the user filters by — they simply render quietly
          below the context line rather than as a second row of loud chips. */}
      {item.labels.length > 0 && (
        <div className="card-labels">
          {item.labels.map((l) => (
            <span key={l} className="chip">
              {l}
            </span>
          ))}
        </div>
      )}
    </article>
  );
});
