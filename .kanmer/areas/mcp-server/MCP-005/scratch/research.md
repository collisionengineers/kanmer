## Measured experiment — relocating the Electron runtime (2026-08-16)

Copied from `%LOCALAPPDATA%\Programs\Kanmer\` into a scratch dir and ran with
`ELECTRON_RUN_AS_NODE=1`:

- `Kanmer.exe` alone → `FATAL icu_util.cc(223): Invalid file descriptor to ICU data received.`
- `+ icudtl.dat + v8_context_snapshot.bin + snapshot_blob.bin` → `node v20.18.0`, works.
- Removing `snapshot_blob.bin` → still works. Removing `v8_context_snapshot.bin`
  → `FATAL v8_initializer.cc(616): Error loading V8 startup snapshot file`.
- **Minimal set = 3 files, 191.98 MB**: `Kanmer.exe` (180,849,664) +
  `icudtl.dat` (10,468,208) + `v8_context_snapshot.bin` (662,053).
- Ran the real `packages/mcp-server/dist/standalone/kanmer-mcp.cjs` from the
  relocated copy: stderr `kanmer-mcp ready — root: …\sandbox`, and
  `Process.Modules` showed **0 modules under `\Programs\Kanmer\`** (45 modules
  total, all from the relocated dir or System32).

The 3 files needed by a relocated copy are exactly the 2 files GUI-064 measured
as un-renameable, plus the exe.
