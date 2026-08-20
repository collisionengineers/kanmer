# Post-implementation report — GUI-076

## Summary

GUI-076 moves the supplied logo and icon out of the repository root and makes them real product assets. The wide logo is bundled by Vite and rendered on the Welcome screen and README; the square icon now deterministically produces the Windows multi-resolution ICO explicitly used by electron-builder. The packaged app, installer, and smoke run were built successfully.

## Changes

| File | Change | Why |
|---|---|---|
| `icon.png` → `apps/gui/build/icon.png` | Moved the square source artwork into GUI build resources. | Keeps root clean and gives the reproducible ICO generator a structural source location. |
| `logo.png` → `apps/gui/src/renderer/src/assets/logo.png` | Moved the wide artwork into the renderer asset tree. | Lets Vite bundle the product logo exactly once for the Welcome screen. |
| `apps/gui/scripts/make-icon.mjs` | Replaced the synthetic hard-coded mark with dependency-free PNG decode, premultiplied-alpha resize, and seven-size ICO generation. | Produces the real supplied icon at Windows' 16–256 px sizes without a manual binary conversion or native dependency. |
| `apps/gui/build/icon.ico` | Regenerated from the supplied icon source. | Electron and Windows packaging now use the intended product identity. |
| `apps/gui/electron-builder.yml` | Added explicit `win.icon: build/icon.ico`. | Makes installer/executable icon selection declarative rather than implicit. |
| `apps/gui/src/renderer/src/assets.d.ts` | Added PNG module typing. | Keeps strict TypeScript valid for the Vite asset import. |
| `apps/gui/src/renderer/src/components/Welcome.tsx` | Added the accessible Welcome-logo image. | Places the wide logo on the first user-visible screen without changing picker, recents, or error flows. |
| `apps/gui/src/renderer/src/styles.css` | Added bounded responsive `.welcome-logo` styling. | Preserves the centred Welcome layout across themes and window sizes. |
| `apps/gui/src/renderer/src/components/Welcome.test.tsx` | Added a DOM regression test. | Protects both the logo and the primary project-picker control. |
| `README.md` | Added the moved logo below the heading. | Uses the same tracked logo as documentation branding. |

## Governing docs

- **`docs/functional/frd/FRD-019-gui-shell.md` R7:** The existing Welcome screen remains the empty-state entry point; this change adds branding without changing its open-project, recents, error, single-instance, or window lifecycle behaviour. Explicit Windows icon packaging supports the product shell identity.
- No governing document was modified and no new ADR is required: source-asset placement and the deterministic ICO generator are implementation details within GUI-076's approved scope.

## Risks / follow-ups

- The generator intentionally accepts the checked-in source's 8-bit RGBA, non-interlaced PNG format. Replacing that source with a different PNG encoding will fail loudly rather than silently regenerate an invalid icon.
- The ICO grew from 2,599 to 156,883 bytes and the built NSIS installer is 79,296,648 bytes; the full 1.35 MB source PNG is not added as an `extraResources` runtime file.
- GUI-091's host-level capture limitation remains: this agent cannot provide a truthful screenshot of the running packaged Electron window. The package smoke proves the renderer starts, but a human should provide final visual confirmation of the Welcome logo if proof requires an image.

## Verification hand-off

Run on merged `main`:

1. `npm run test -w @kanmer/gui` — expect 25 files / 278 tests passing.
2. `npm run typecheck -w @kanmer/gui` and `npm run build -w @kanmer/gui` — expect both to pass and the built renderer to include the hashed logo asset.
3. `node apps/gui/scripts/make-icon.mjs` twice and compare `apps/gui/build/icon.ico` SHA-256 — expect stable `3A9C5B35A1ECCD88FD06593AB9E0AFE2A2621ADB1C5D2DDA924A316B1D0D8C18` with 16/24/32/48/64/128/256 px 32-bit entries.
4. `npm run dist` — expect `apps/gui/release/win-unpacked/Kanmer.exe` and `Kanmer Setup 0.3.3.exe`; inspect the executable/installer icon and launch the packaged app on the no-project Welcome screen.
5. Capture or obtain human confirmation that the wide logo is visible above “Kanmer” and the “Open project folder…” control remains usable.
