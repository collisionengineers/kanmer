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
