# Checklist

- [x] Refresh the committed plugin artifact from the cumulative source tree.
- [x] `npm run mcpb:check` passes and the diff contains no source changes.
- [ ] Independent review records the exact commit and merge SHA.

## Remediation evidence

- Clean detached cumulative checkout at `973bcf9340aa2c627c717a00f1bcf0f6d3fca242` ran its own `npm ci` (exit 0), `npm run plugin:build` (exit 0), and `npm run mcpb:check` (exit 0; server SHA `f52d9c5b3817b12432e211438913146908c32874bf74ac261839a21ee31ea58c`; 3 files / 1,671,293 bytes).
- The committed artifact changed only from the stale `7298b5c2...` / 1,590,774-byte result to `f52d9c5b...` / 1,594,808 bytes. Linked-worktree mcpb exit 1 and its stale-core export errors remain preserved. Independent review item remains intentionally unchecked.
