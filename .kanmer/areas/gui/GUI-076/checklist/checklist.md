# Checklist — GUI-076

- [ ] Move the supplied square asset to `apps/gui/build/icon.png`, the supplied wide asset to `apps/gui/src/renderer/src/assets/logo.png`, and prove no root-level `icon.png` or `logo.png` remains.
- [ ] Make `apps/gui/scripts/make-icon.mjs` deterministically decode the moved RGBA icon source and regenerate a 16/24/32/48/64/128/256 px `apps/gui/build/icon.ico` instead of the synthetic mark.
- [ ] Configure `apps/gui/electron-builder.yml` to use the generated Windows ICO explicitly and verify the development window's `main/index.ts` icon path remains valid.
- [ ] Import and render the wide logo in `Welcome.tsx` with accessible alt text while preserving its existing picker, recent-project, and error flows.
- [ ] Add responsive, theme-safe `.welcome-logo` CSS without changing the compact top-bar brand or unrelated navigation.
- [ ] Add the moved logo to the README's opening branding area using its stable repository-relative path.
- [ ] Add and pass a focused Welcome component regression test covering both the logo and “Open project folder…” control.
- [ ] Run GUI tests, GUI typecheck, and GUI build; record the successful outputs.
- [ ] Regenerate the ICO a second time and verify stable bytes plus all seven intended icon sizes.
- [ ] Build the Windows package, inspect the packaged executable/installer icon and installer size, and record visual Welcome-logo evidence (or GUI-091's human-verification limitation) for proof.

## Progress notes
