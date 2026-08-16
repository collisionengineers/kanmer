# 5.3 Dirty-guard across tabs

- The generalized `pendingNav` gains `kind: 'select'|'tab'|'close'`; `trySwitchTab`/`closeTab` route through the same discard modal as `trySelect`. `beforeunload` (`App.tsx:105-114`) must OR across all tabs' `editorDirty`. Because only the active tab's `ProjectView` (hence `Editor`) is mounted, this guard is what prevents silent loss on switch/close.
