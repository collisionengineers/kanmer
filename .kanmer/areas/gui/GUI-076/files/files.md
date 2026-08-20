# Files — GUI-076

Surveyed before planning. This ticket moves two committed root assets and makes each visible in its appropriate product surface.

## Where the change lands

| Path | Why |
|---|---|
| `icon.png` | Current 1254×1254 root source; remove after relocating it into the icon-generation/input flow. |
| `logo.png` | Current 1672×941 root source; remove after relocating it into the renderer-owned/documentation asset flow. |
| `apps/gui/build/icon.ico` | Replace the current 2,599-byte synthetic generated icon with a multi-resolution ICO based on the supplied square asset; electron-builder uses `build/` as build resources. |
| `apps/gui/scripts/make-icon.mjs` | Change or replace the generator so the committed ICO is reproducibly derived from the supplied icon rather than hard-coded RGBA bars. |
| `apps/gui/electron-builder.yml` | Make the Windows icon input explicit if required by the chosen reproducible ICO flow; this is the authoritative installer/executable packaging configuration. |
| `apps/gui/src/main/index.ts` | Keep the development `BrowserWindow` icon path aligned with the generated/replaced `build/icon.ico`; alter only if the new asset location requires it. |
| `apps/gui/src/renderer/src/assets/logo.png` (new) | Renderer-owned destination for the wide logo, imported by Vite so it is included in the built renderer. |
| `apps/gui/src/renderer/src/components/Welcome.tsx` | Render the logo in the no-project Welcome screen with accessible alt text. |
| `apps/gui/src/renderer/src/styles.css` | Add bounded/responsive Welcome-logo styling that works in dark/light themes without displacing the picker or recents. |
| `README.md` | Show the wide logo near the project heading using its tracked non-root path; revise only branding copy/path references necessary for the move. |
| `apps/gui/src/renderer/src/components/Welcome.test.tsx` (new) | Focused regression test that the empty-state surface renders the actual logo asset and preserves the primary open-project control. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `apps/gui/electron-builder.yml` | `directories.buildResources: build` is the installer icon convention; `files:` deliberately packages only `out/**` and `package.json`, so renderer assets must enter through Vite rather than arbitrary top-level copies. |
| `apps/gui/electron.vite.config.ts` | The renderer root is `apps/gui/src/renderer`; an imported asset below its `src/` tree is emitted in production by Vite. |
| `apps/gui/src/main/index.ts` | `iconPath()` uses `join(app.getAppPath(), "build", "icon.ico")` only for dev; packaged builds need the exe/installer icon supplied by electron-builder. |
| `apps/gui/scripts/make-icon.mjs` | Existing ICO output has seven sizes (16–256 px), but the encoder draws a synthetic mark and has no PNG decoder—replacing the input requires a deliberate deterministic conversion strategy. |
| `apps/gui/src/renderer/index.html` | CSP allows same-origin images and `data:`; a Vite-generated local logo needs no CSP relaxation. |
| `apps/gui/src/renderer/src/App.tsx` and `styles.css` | Existing text-only `.brand` is a separate compact navigation identity; avoid expanding this ticket into wholesale topbar redesign unless the plan identifies a necessary small alignment change. |
| `docs/functional/frd/FRD-019-gui-shell.md` | Governs the Welcome screen and makes it the correct first visible logo placement; it does not demand marketplace image metadata. |
| `GUI-091` | Records that agent-side Electron screenshot capture is unavailable; it constrains proof collection, not product implementation. |

## Ripple effects

- Vite must emit the imported logo in `out/renderer`; a GUI build is necessary to catch an invalid asset import.
- electron-builder must consume a valid multi-size ICO and yield an executable/NSIS installer carrying it; package-level success is not enough.
- README image rendering depends on a stable repo-relative asset path, so the root move must update the Markdown reference in the same change.
- Tests should cover the renderer's visible logo; packaging verification should also measure the resulting installer before/after rather than treating source PNG size as shipped-size evidence.
- The final proof needs visual confirmation of the Welcome screen. If no capture mechanism is available, note GUI-091 and obtain a human-provided screenshot/confirmation rather than inventing an automated screenshot claim.

## Out of scope

- New image art, a logo redesign, marketplace schema changes, macOS/Linux icon formats, and broad topbar rebranding.
- Shipping the original full-resolution PNGs as arbitrary `extraResources`; the source files are inputs, while the renderer build and ICO are the product outputs.
- Changing the overall GUI shell behaviour governed by FRD-019 beyond the Welcome branding placement.
