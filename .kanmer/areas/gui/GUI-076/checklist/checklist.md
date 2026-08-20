# Checklist — GUI-076

- [x] Move the supplied square asset to `apps/gui/build/icon.png`, the supplied wide asset to `apps/gui/src/renderer/src/assets/logo.png`, and prove no root-level `icon.png` or `logo.png` remains.
- [x] Make `apps/gui/scripts/make-icon.mjs` deterministically decode the moved RGBA icon source and regenerate a 16/24/32/48/64/128/256 px `apps/gui/build/icon.ico` instead of the synthetic mark.
- [x] Configure `apps/gui/electron-builder.yml` to use the generated Windows ICO explicitly and verify the development window's `main/index.ts` icon path remains valid.
- [x] Import and render the wide logo in `Welcome.tsx` with accessible alt text while preserving its existing picker, recent-project, and error flows.
- [x] Add responsive, theme-safe `.welcome-logo` CSS without changing the compact top-bar brand or unrelated navigation.
- [x] Add the moved logo to the README's opening branding area using its stable repository-relative path.
- [x] Add and pass a focused Welcome component regression test covering both the logo and “Open project folder…” control.
- [x] Run GUI tests, GUI typecheck, and GUI build; record the successful outputs.
- [x] Regenerate the ICO a second time and verify stable bytes plus all seven intended icon sizes.
- [x] Build the Windows package, inspect the packaged executable/installer icon and installer size, and record visual Welcome-logo evidence (or GUI-091's human-verification limitation) for proof.

## Progress notes

- 2026-08-20: moved both root PNGs; generated the seven-entry ICO from the supplied RGBA source; added Welcome/README branding and passed the focused Welcome test.
- 2026-08-20: GUI typecheck passed; full GUI test suite passed (25 files, 278 tests); production build emitted the 767,621-byte hashed renderer logo asset.
- 2026-08-20: regenerated `icon.ico` twice with stable SHA-256 `3A9C5B35A1ECCD88FD06593AB9E0AFE2A2621ADB1C5D2DDA924A316B1D0D8C18`; inspected all seven 32-bit entries.
- 2026-08-20: `npm run dist` passed. The 79,296,648-byte NSIS installer and `win-unpacked/Kanmer.exe` were produced; Windows extracted a 32×32 executable icon, and the packaged GUI smoke passed. GUI-091 still prevents this agent from capturing a running-window screenshot, so final visual proof requires human confirmation rather than a fabricated image.
