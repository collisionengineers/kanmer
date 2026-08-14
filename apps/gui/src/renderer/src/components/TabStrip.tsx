/** One open project tab. */
export interface Tab {
  projectId: string;
  root: string;
  name: string;
  /** Agent/manual changes seen while this tab was in the background. */
  unread: number;
}

interface TabStripProps {
  tabs: Tab[];
  activeId: string | null;
  /** Whether the active tab has unsaved editor edits (shows a dirty dot). */
  dirty: boolean;
  onSelect: (projectId: string) => void;
  onClose: (projectId: string) => void;
  onNew: () => void;
}

/**
 * The project tab strip (Phase 5). Switching a tab is dirty-guarded by App
 * (onSelect routes through the same discard modal as a project open). Middle-
 * click closes a tab; a background tab shows an unread dot, the active tab a
 * dirty dot.
 */
export function TabStrip({
  tabs,
  activeId,
  dirty,
  onSelect,
  onClose,
  onNew,
}: TabStripProps): JSX.Element {
  return (
    <div className="tab-strip" role="tablist" aria-label="Open projects">
      {tabs.map((t) => {
        const active = t.projectId === activeId;
        return (
          <div
            key={t.projectId}
            role="tab"
            aria-selected={active}
            className={active ? "proj-tab active" : "proj-tab"}
            title={t.root}
            onClick={() => onSelect(t.projectId)}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                onClose(t.projectId);
              }
            }}
          >
            <span className="proj-tab-name">{t.name || t.root}</span>
            {active && dirty && <span className="proj-dot dirty" aria-label="unsaved changes" />}
            {!active && t.unread > 0 && (
              <span className="proj-dot unread" aria-label={`${t.unread} unread`} />
            )}
            <button
              className="proj-close"
              aria-label={`Close ${t.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onClose(t.projectId);
              }}
            >
              ×
            </button>
          </div>
        );
      })}
      <button className="proj-new" title="Open another project" onClick={onNew}>
        +
      </button>
    </div>
  );
}
