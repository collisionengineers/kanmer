import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  firstEnabledIndex,
  lastEnabledIndex,
  menuPosition,
  nextEnabledIndex,
  submenuPosition,
} from "../lib/menu.js";

/**
 * A renderer-drawn context menu (FRD-019 R6).
 *
 * Electron's native `Menu` cannot see the app's CSS variables, so a card menu
 * drawn by the OS is always slightly wrong in one theme and jarring in the
 * other — and on Windows it ignores the app's density and radius entirely. This
 * replaces it: same theme tokens as everything else, in every theme, with real
 * keyboard semantics.
 *
 * Rendered through a portal so a menu opened from a card inside an
 * `overflow: auto` column is not clipped by it.
 */

export interface MenuItem {
  id: string;
  label: string;
  /** Present = a submenu; `onSelect` is then ignored. */
  items?: MenuItem[];
  onSelect?: () => void;
  disabled?: boolean;
  /** Why it is disabled — shown as a tooltip, so a gate can explain itself. */
  disabledReason?: string;
  /** Draw a separator above this item. */
  separatorBefore?: boolean;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
  /** Accessible name for the menu. */
  label?: string;
}

export function ContextMenu({ x, y, items, onClose, label = "Actions" }: ContextMenuProps): JSX.Element {
  return createPortal(
    <div className="ctx-backdrop" onContextMenu={(e) => e.preventDefault()}>
      <MenuPanel x={x} y={y} items={items} onClose={onClose} label={label} depth={0} />
    </div>,
    document.body,
  );
}

function MenuPanel({
  x,
  y,
  items,
  onClose,
  label,
  depth,
}: ContextMenuProps & { depth: number }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: -9999, top: -9999 });
  const [active, setActive] = useState(-1);
  const [openSub, setOpenSub] = useState<{ index: number; x: number; y: number } | null>(null);

  // Measure before paint so the menu never appears in the wrong place first.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(
      depth === 0
        ? menuPosition(x, y, r, { width: window.innerWidth, height: window.innerHeight })
        : submenuPosition(
            { left: x - r.width, right: x, top: y },
            r,
            { width: window.innerWidth, height: window.innerHeight },
          ),
    );
  }, [x, y, items, depth]);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  useEffect(() => {
    if (active < 0) return;
    const activeItem = ref.current?.querySelectorAll<HTMLElement>("[role='menuitem']")[active];
    activeItem?.scrollIntoView?.({ block: "nearest" });
  }, [active]);

  const step = useCallback(
    (dir: 1 | -1) => {
      setActive((cur) => nextEnabledIndex(items, cur, dir));
    },
    [items],
  );

  const choose = (item: MenuItem, index: number, rect?: DOMRect) => {
    if (item.disabled) return;
    if (item.items?.length) {
      const r = rect ?? { right: pos.left + 180, top: pos.top };
      setOpenSub({ index, x: (r as DOMRect).right ?? pos.left + 180, y: (r as DOMRect).top ?? pos.top });
      return;
    }
    item.onSelect?.();
    onClose();
  };

  return (
    <>
      <div
        ref={ref}
        className="ctx-menu"
        role="menu"
        aria-label={label}
        tabIndex={-1}
        style={{ left: pos.left, top: pos.top }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            step(1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            step(-1);
          } else if (e.key === "Home") {
            e.preventDefault();
            setActive(firstEnabledIndex(items));
          } else if (e.key === "End") {
            e.preventDefault();
            setActive(lastEnabledIndex(items));
          } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const item = items[active];
            if (item) {
              const el = ref.current?.querySelectorAll("[role='menuitem']")[active];
              choose(item, active, el?.getBoundingClientRect());
            }
          } else if (e.key === "ArrowRight") {
            const item = items[active];
            if (item?.items?.length) {
              e.preventDefault();
              const el = ref.current?.querySelectorAll("[role='menuitem']")[active];
              choose(item, active, el?.getBoundingClientRect());
            }
          } else if (e.key === "ArrowLeft" && depth > 0) {
            e.preventDefault();
            onClose();
          }
        }}
      >
        {items.map((item, i) => (
          <div key={item.id}>
            {item.separatorBefore && <div className="ctx-sep" role="separator" />}
            <button
              type="button"
              role="menuitem"
              className={[
                "ctx-item",
                i === active ? "active" : "",
                item.disabled ? "disabled" : "",
                item.danger ? "danger" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-disabled={item.disabled || undefined}
              aria-haspopup={item.items?.length ? "menu" : undefined}
              aria-expanded={item.items?.length ? openSub?.index === i : undefined}
              title={item.disabled ? item.disabledReason : undefined}
              onMouseEnter={(e) => {
                setActive(i);
                if (item.items?.length && !item.disabled) {
                  choose(item, i, e.currentTarget.getBoundingClientRect());
                } else {
                  setOpenSub(null);
                }
              }}
              onClick={(e) => choose(item, i, e.currentTarget.getBoundingClientRect())}
            >
              <span>{item.label}</span>
              {item.items?.length ? <span className="ctx-arrow">›</span> : null}
            </button>
          </div>
        ))}
      </div>
      {openSub && items[openSub.index]?.items?.length ? (
        <MenuPanel
          x={openSub.x}
          y={openSub.y}
          items={items[openSub.index].items!}
          onClose={onClose}
          label={items[openSub.index].label}
          depth={depth + 1}
        />
      ) : null}
    </>
  );
}

/**
 * Close-on-outside-interaction, as a hook so the backdrop stays a plain element
 * and pointer events on it are not swallowed.
 */
export function useDismissOnOutside(onClose: () => void, active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const close = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(".ctx-menu")) return;
      onClose();
    };
    // `mousedown` rather than `click`: closing on press matches every native
    // menu, and a click handler would also fire for the press that opened it.
    window.addEventListener("mousedown", close, true);
    window.addEventListener("contextmenu", close, true);
    window.addEventListener("blur", onClose);
    window.addEventListener("resize", onClose);
    window.addEventListener("wheel", close, { passive: true });
    return () => {
      window.removeEventListener("mousedown", close, true);
      window.removeEventListener("contextmenu", close, true);
      window.removeEventListener("blur", onClose);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("wheel", close);
    };
  }, [onClose, active]);
}
