# Research — GUI-097: local editor modes

## Findings

- After GUI-096, Editor has these existing surfaces: Ticket (body + first-group context), pipeline document tabs, and a separate Scratch tab. No new data API is needed for modes.
- The current editor owns local `tab` state and always starts on `ticket`. App owns selected ticket ID only; card open/board selection currently has no opening context.
- A mode is presentation guidance, not workflow state. It must not be persisted to ticket/board files, change gates, hide documents, or create another Board/Standup/Archived view.
- Exact mapping is fixed:
  - `approval` → `ticket`
  - `execution` → `plan`
  - `review` → `scratch`
  - `evidence` → `proof`
- “Starting tab” means apply once when the editor opens for an item or when an explicit new opening request changes mode. User tab selection afterwards must not be continually reset by item refreshes.
- Non-primary tabs remain mounted/available in the tab strip. Add a subdued/dim class and accessible indication; do not use `display:none`, `hidden`, disabled controls, or filtering.
- The editor should show a compact mode selector/label in its header so the user can intentionally switch mode; switching mode selects that mode’s mapped starting tab after applying the same dirty-document guard as ordinary tab changes.
- App should store ephemeral `{selectedId, editorMode}`. Board/card/wiki/navigation opens default to `approval`. A helper `openEditor(id, mode="approval")` prevents call-site drift.
- Existing dispatch actions can pass `execution`: select/open the ticket in Execution mode before/when starting a dispatch. This is presentation only; dispatch eligibility still comes from existing gate-derived options.
- If the mapped tab is absent as content, the current empty/create state is still shown. Review maps to the Scratch container even with no notes; Evidence maps to proof even if absent. Do not fall back silently to another mode.
- Session persistence should continue storing selected ID only or restore mode as Approval; the seed calls the enum local and board opens default Approval.

## Test implications

- Extract/export a pure `startingTabForMode(mode)` and mode metadata for deterministic tests.
- Component tests must prove each initial mode, mode switching with dirty guard, all tabs remain visible, dimming only, and item refresh does not reset user-selected tab.
- App tests/pure selection-state tests must prove ordinary open defaults Approval and dispatch passes Execution.

## Remaining unknowns

None. GUI-096 must merge first; DOC-011 will formalize FRD-019 and `docs_todo` remains until linked.
