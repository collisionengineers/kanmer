# 5.2 `App.tsx`

State:
```ts
const [update, setUpdate] = useState<UpdateStatusEvent | null>(null);
const [updateDismissed, setUpdateDismissed] = useState(false);
const [pendingRestart, setPendingRestart] = useState<string | null>(null);
const toastedVersion = useRef<string | null>(null);
```

Subscription (one effect, no `root` dependency — updates are app-global, not project-scoped):
```ts
useEffect(() => {
  void window.kanmer.getUpdateState().then(setUpdate);
  return window.kanmer.onUpdateStatus(setUpdate);
}, []);
```

Surface effect: derive `updateSurface(update, updateDismissed)`; on `kind === "toast"`, push into the **existing** toast stack (`:754-770`) with `id: null` and the existing 4500 ms auto-dismiss, deduped by `toastedVersion.current` so a download's many `downloading` emits produce one toast.

Banner: rendered next to the existing `format === 1` banner (`:610-633`), same markup shape:
```tsx
{surface.kind === "banner" && (
  <div className="banner info">
    <span>Kanmer {surface.version} is ready to install.</span>
    <div className="conflict-actions">
      <button className="primary xs" onClick={() => void onRestartToUpdate()}>Restart now</button>
      <button className="ghost xs" onClick={() => setUpdateDismissed(true)}>Later</button>
    </div>
  </div>
)}
```
"Later" is free — `autoInstallOnAppQuit` installs on the next normal quit. Say so in a `title=` tooltip: *"Installs the next time you quit Kanmer."*

**The gate — this is the whole point of the phase:**
```tsx
const onRestartToUpdate = useCallback(async () => {
  const sessions = await window.kanmer.mcpSessions()
    .catch(() => ({ count: 0, projects: [], unknown: true }));
  const warning = restartWarning(editorDirty.current ? selectedId : null, sessions);
  if (warning === null) { void window.kanmer.installUpdate(); return; }
  setPendingRestart(warning);
}, [selectedId]);
```
and the confirm, next to the existing two `ConfirmModal`s (`:772-797`):
```tsx
{pendingRestart && (
  <ConfirmModal
    message={pendingRestart}
    actionLabel="Restart and update"
    onCancel={() => setPendingRestart(null)}
    onConfirm={() => {
      editorDirty.current = false;
      setPendingRestart(null);
      void window.kanmer.installUpdate();
    }}
  />
)}
```

**Invariant to state in a comment and in AGENTS §7:** `window.kanmer.installUpdate()` has exactly **two** call sites — the `warning === null` early return and this `onConfirm`. Both are downstream of the probe. Nothing else may call it.

One modal, not two chained ones: `restartWarning` composes both facts into one sentence, so the user is asked once.
