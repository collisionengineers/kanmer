## Re-measured 2026-08-16 (research pass, read-only)

```
C:\Users\PC\AppData\Local\Programs\Kanmer\resources\mcp\kanmer-mcp.cjs
  sha256 e92a26793f712a8f…   grep -c questions-resolved = 0   mtime 2026-08-16 16:14:14   1 465 172 B

C:\Users\PC\Documents\GitHub\kanmer\plugins\kanmer\mcp\kanmer-mcp.cjs
  sha256 96fe9f8ae7b305e3…   grep -c questions-resolved = 1   mtime 2026-08-16 18:35:59   1 467 810 B
```

Registrations that produce the split:
- `.codex/config.toml` → `…\Programs\Kanmer\resources\mcp\kanmer-mcp.cjs`, with `--repo-root`.
- `.mcp.json` (Claude) → `<repo>\plugins\kanmer\mcp\kanmer-mcp.cjs`, **no `--repo-root`**.

Both point `--root` at `…\.worktrees\kanmer`. So the two hosts differ in *two*
invisible ways, not one: the binary, and the repo-root used to resolve `refs`.
