# 7.3 UI hooks

- **Handoff to GUI:** a native item-menu "Dispatch to agent →" submenu (`showItemMenu` `main/index.ts:352-387`, action union gains `{type:"dispatch", target}`) and/or an Editor headbar button (`Editor.tsx:364-378`). New IPC `dispatchAgent`/`cancelDispatch`/`listDispatches`/`onDispatchStatus` (channel + handler `main/index.ts:447-449` pattern + preload wrapper).
- **Dispatches drawer:** a small panel (activity-feed pattern) listing running/finished dispatches — provider, ticket, elapsed, status — with a **live output tail** from the app-local log and a cancel button; dispatched tickets get a spinner badge on their card (partially delivers the never-built agent-presence indicator from the Phase 0 loose ends).
