# Plan — GUI-076: place and wire the committed logo and icon assets

## Approach

Use each supplied asset in the surface it was made for instead of copying full-resolution PNGs into arbitrary packaged resources: move the wide logo into the renderer source tree and import it into the Welcome screen/README, while moving the square source into the GUI build resources and extending the existing dependency-free icon generator to produce the committed multi-resolution Windows ICO. This preserves Vite's normal renderer asset pipeline, preserves electron-builder's normal build-resource pipeline, makes Windows icon selection explicit, and removes both root-level assets. The source icon is a standard non-interlaced 8-bit RGBA PNG, so the in-repo generator can deterministically decode/filter/resample it without a new native dependency; this is preferable to a manual one-off ICO conversion or a large new image-processing dependency.

## Governing docs

- **Meets `docs/functional/frd/FRD-019-gui-shell.md` R7** — Steps 3–5 improve the existing Welcome screen without changing its empty-state behaviour, while Steps 1–2 preserve the native app/installer identity paths. No FRD amendment or new ADR is needed: asset placement and generation are implementation choices within the ticket's explicit scope.
- **Meets the ticket acceptance criteria** — Step 1 removes root PNGs, Steps 2 and 6 prove the real icon reaches the packaged output, Steps 3–5 place the logo on visible product/documentation surfaces, and Step 6 records size and visual evidence.

## Steps

1. Move the square source to `apps/gui/build/icon.png` and the wide source to `apps/gui/src/renderer/src/assets/logo.png`; update all references in the same change and verify neither `icon.png` nor `logo.png` remains at the repository root.
2. Replace the hard-coded-mark implementation in `apps/gui/scripts/make-icon.mjs` with deterministic PNG decoding (the checked source format is non-interlaced 8-bit RGBA), resizing, and ICO assembly for 16, 24, 32, 48, 64, 128, and 256 px. Regenerate and commit `apps/gui/build/icon.ico`, then make `win.icon` explicit in `apps/gui/electron-builder.yml`; retain `main/index.ts`'s development `icon.ico` lookup unless a build proves it needs a matching path correction.
3. Import the logo asset in `components/Welcome.tsx` and render it before the existing Welcome heading with concise accessible alt text; preserve the folder picker, recents, and error states.
4. Add bounded, responsive `.welcome-logo` styling in `styles.css` that preserves the existing centred flexible layout and is legible on both themes. Do not replace the compact top-bar wordmark or redesign unrelated navigation.
5. Add the same tracked logo to the README's opening branding area using its post-move repository-relative path. Add a focused Welcome component regression test that asserts the logo/alt text and the existing primary “Open project folder…” action render together.
6. Run targeted GUI tests, full GUI typecheck/build, and a Windows package build. Inspect the emitted renderer asset and the generated multi-size ICO; inspect the packaged executable/installer for the configured icon, record installer size, and obtain visual confirmation of the Welcome logo. If an agent cannot capture the running Electron window, record GUI-091's limitation and request human screenshot/confirmation instead of claiming synthetic visual evidence.

## Verification

- `rg --files -g 'icon.png' -g 'logo.png'` confirms the two source images are no longer at the root and live only at their intended paths.
- Run the new Welcome test plus `npm run test -w @kanmer/gui`, `npm run typecheck -w @kanmer/gui`, and `npm run build -w @kanmer/gui`.
- Run the icon generator twice and compare the committed `build/icon.ico` bytes to demonstrate deterministic output; inspect its ICO entries for the seven planned sizes.
- Run the repository's Windows packaging command (`npm run dist` or the narrower electron-builder equivalent only when all release inputs are present); inspect `apps/gui/release/win-unpacked/Kanmer.exe` and the NSIS installer, and record its size.
- Launch the packaged app on the Welcome screen and capture/obtain confirmation that the wide logo is visible, with the current picker/recents controls still usable.

## Risks / open questions

- **Risk — ICO decoder/resampler correctness.** Mitigate with the known source PNG constraints, multi-size container inspection, repeatable generation, and the packaged icon check; do not silently fall back to the old synthetic mark.
- **Risk — high-resolution image inflates product output.** Keep `icon.png` as build input only (not an `extraResources` runtime file), let Vite hash the logo asset once, and compare the final installer size.
- **Risk — visual proof cannot be automated on this host (GUI-091).** The implementation can still be verified structurally and packaged; final visual proof must be human-provided if capture remains unavailable.
- **Open questions — none.** The ticket already authorizes this user-visible branding placement and the research records the required asset split.
