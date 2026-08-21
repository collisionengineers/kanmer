# Proof — GUI-091

## Merged revision

- PR: [#98](https://github.com/collisionengineers/kanmer/pull/98)
- Squash merge on `main`: `a1a61757c5391f5226a927663303b5ef391ac512`

## Commands and results on merged main

- PASS: `npm test -w @kanmer/gui -- smokeCapture.test.ts` — 5 tests passed.
- PASS: `npm run typecheck -w @kanmer/gui`.
- PASS: `npm run build -w @kanmer/gui`.
- PASS: `git diff --check`.

## Live Electron evidence

From `apps/gui`, with a fresh user-data directory and an unused absolute PNG path:

```powershell
$env:KANMER_SMOKE='1'
$env:KANMER_OPEN='C:\\Users\\Alex\\Documents\\GitHub\\kanmer'
$env:KANMER_SMOKE_CAPTURE_PATH='<fresh-temp>\\capture.png'
& 'C:\\Users\\Alex\\Documents\\GitHub\\kanmer\\node_modules\\.bin\\electron.cmd' \
  "--user-data-dir=<fresh-temp>\\profile" '.'
```

The merged app reported:

```
KANMER_SMOKE: captured 1264x755 renderer PNG with marker
KANMER-SMOKE-1787274920329-17020 at <fresh-temp>\\capture.png
```

The artifact was 140,480 bytes. Visual inspection of that generated PNG confirmed:

- the running Kanmer board, including GUI-091 in the Implementing column;
- the visible red `KANMER-SMOKE-1787274920329-17020` marker in the top-right;
- current board counts/content, establishing the image came from the live renderer rather than a stale capture.

## Boundary

This proves repeatable agent capture of the running Electron **renderer page** on this host. Electron `webContents.capturePage()` does not include native title/menu chrome or OS-owned dialogs. [[GUI-068]]'s real-release native refusal-dialog evidence remains deliberately out of scope.

## Closeout record

PR [#98](https://github.com/collisionengineers/kanmer/pull/98) merged at 2026-08-21T01:14:34Z as `a1a61757c5391f5226a927663303b5ef391ac512`.
