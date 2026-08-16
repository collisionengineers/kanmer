## BEFORE the fix — the drift reproduced live, 2026-08-16

Re-measured, and then both builds actually *asked* what they are.

### 1. The two binaries are provably different

```
C:\Users\PC\AppData\Local\Programs\Kanmer\resources\mcp\kanmer-mcp.cjs
  sha256 e92a26793f712a8f23e0d25b5da96142d56e0e1ee46356fd80387c4c3125ab3b
  size 1 465 172   mtime 2026-08-16 16:14:14
  grep -c questions-resolved = 0        <-- does NOT enforce the gate

C:\Users\PC\Documents\GitHub\kanmer\plugins\kanmer\mcp\kanmer-mcp.cjs
  sha256 96fe9f8ae7b305e34e89fe8fb3bbdb67678dcad45960dd86814684fa77199e33
  size 1 467 810   mtime 2026-08-16 18:35:59
  grep -c questions-resolved = 1        <-- DOES enforce the gate
```

### 2. `get_status` cannot tell them apart — the actual defect

Both spawned over real stdio against the same board
(`…\.worktrees\kanmer`), each with its own registration's arguments
(`.codex/config.toml` passes `--repo-root`, `.mcp.json` does not):

```
INSTALLED  (e92a2679, gate absent,  --repo-root PASSED)
REPO       (96fe9f8a, gate present, --repo-root ABSENT)
```

Both returned **byte-identical** JSON:

```json
{ "projectRoot": "…\\.worktrees\\kanmer",
  "kanmerDir":   "…\\.worktrees\\kanmer\\.kanmer",
  "exists": true, "format": 3, "boardSource": "file",
  "deploymentTracking": false,
  "counts": { … identical … }, "warningsCount": 0 }
```

Not one field differs. **Two different gate enforcers and two different
`refs` resolution bases, and the orientation call reports the same thing for
both.** That is the ticket in one paragraph: the difference is not merely
undocumented, it is unobservable.

(Neither reports `rootSource` either — both bundles predate MCP-010.)

This pair is the falsifying case. The same two commands, run after the fix,
are the proof.

## AFTER the fix — same two commands, same board

### A. The installed 0.3.2 bundle (sha `e92a2679`), codex args incl. `--repo-root`

```json
{ "projectRoot": "…\\.worktrees\\kanmer",
  "kanmerDir": "…", "exists": true, "format": 3, "boardSource": "file", … }
```

**No `server` block. No `repoRoot`. No `rootSource`.** That is not a bug — it is
the design: detection is one-sided, an old binary cannot be made to talk, and
its **silence is the signal** "this build predates server identity (pre-0.3.3)".

### B. The rebuilt bundle, `.mcp.json` args (no `--repo-root`)

```json
{ "projectRoot": "…\\.worktrees\\kanmer",
  "repoRoot": "C:\\Users\\PC\\Documents\\GitHub\\kanmer",
  "rootSource": "flag",
  "repoRootSource": "derived",
  "server": {
    "version": "0.3.2",
    "path": "…\\plugins\\kanmer\\mcp\\kanmer-mcp.cjs",
    "sha256": "97f6ca41472d5eb8bc1efe67e523fdb33d0dc4f19181ffb325f2dd4b939fbd34",
    "sha256Short": "97f6ca41", "mtime": "2026-08-16T22:54:08.251Z",
    "size": 1474730, "build": "plugin" } }
```

### The comparison, before and after

| | before | after |
|---|---|---|
| old installed build | indistinguishable | **block absent** → "pre-0.3.3" |
| current build | indistinguishable | `97f6ca41`, `build: plugin`, v0.3.2 |
| `refs` resolution base | invisible | `repoRoot` + `repoRootSource: derived` |

Two builds that previously returned identical JSON in every field are now
distinguishable on first contact, in both directions.

### Survives packaging — the real pack, not a simulation

`npm run dist` (exit 0) →
`apps\gui\release\win-unpacked\resources\mcp\kanmer-mcp.cjs`, driven by
`smoke.mjs` through the **real `Kanmer.exe`** as node
(`KANMER_SERVER` + `KANMER_NODE`, ELECTRON_RUN_AS_NODE=1):

```
build: "packaged"      sha 97f6ca41…      size 1474730      133/133 checks
packed sha == committed plugin bundle sha == 97f6ca41…
```

So the same bytes correctly report `packaged` from the app and `plugin` from
the checkout — the shape comes from where it was launched, the hash from what
it is. A packaged app reports the packaged bundle, not a dev path.

### Determinism (the constraint the whole design bends around)

```
three consecutive builds → 97f6ca41…  identical, plugin:check green
version bumped 0.3.2→0.3.3 → 142de977…  plugin:check FAILS as predicted
version restored          → 97f6ca41…  plugin:check green
```

That middle line is the empirical case for the `release.mjs` change: the bundle
is a function of the version, so without a rebuild after the bump, v0.3.3 ships
a bundle reporting 0.3.2 **and** leaves `plugin:check` red on main.
