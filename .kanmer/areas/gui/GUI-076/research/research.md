# Research — GUI-076: wire committed logo and icon assets into the product

## Question

Where should the committed root-level `logo.png` and `icon.png` live, and which current GUI, packaging, documentation, and verification paths must change for them to become deliberate product assets rather than unused files?

## Findings

- `icon.png` and `logo.png` are the only files in the ticket folder's work-item scope before research; neither a `research/`, `files/`, nor `open-questions/` document existed. The `rg --files .worktrees/kanmer/.kanmer/areas/gui/GUI-076` audit found only `GUI-076.md`.
- The assets are tracked at the repository root by commit `9ec7741` (which added only those two files). They are currently unreferenced anywhere in the application, installer configuration, README, or marketplace manifests. Source: `git show --stat 9ec7741` and repository-wide reference search.
- `icon.png` is a 1254×1254 PNG (1,347,990 bytes); `logo.png` is 1672×941 (767,621 bytes). Visual inspection confirms the square artwork is an app-icon composition and the wide artwork carries the Kanmer wordmark. They are distinct assets, not interchangeable. Source: image metadata and visual inspection.
- Windows packaging currently names `apps/gui/build` as electron-builder's `buildResources`, but does not explicitly configure an icon. The committed `apps/gui/build/icon.ico` is only 2,599 bytes and is generated from a hard-coded synthetic mark by `apps/gui/scripts/make-icon.mjs`; it does not consume `icon.png`. Source: `apps/gui/electron-builder.yml`, `build/icon.ico`, and `scripts/make-icon.mjs`.
- Electron's main process passes `build/icon.ico` as the development window icon when it exists; packaged builds rely on the executable/installer icon produced by electron-builder. Source: `apps/gui/src/main/index.ts` (`iconPath` and `BrowserWindow` construction).
- The renderer has no asset directory or image use. `Welcome.tsx` renders a text `<h1>Kanmer</h1>`, and `App.tsx` renders a text-only `.brand` wordmark. The renderer's CSP permits same-origin image resources, so a Vite-imported local logo is compatible. Source: `Welcome.tsx`, `App.tsx`, `styles.css`, and `src/renderer/index.html`.
- The README begins with a text-only `# Kanmer` heading. The marketplace files are JSON metadata with names/descriptions only and have no image-logo field to wire. Source: `README.md`, `.claude-plugin/marketplace.json`, and `.agents/plugins/marketplace.json`.
- The linked governing document, `FRD-019-gui-shell.md`, explicitly requires the empty-state Welcome screen; it does not prescribe a branding asset or installer icon. The ticket's concrete acceptance criteria supply that delta.
- There is currently no Welcome component test. The normal GUI build and packaging path is `npm run dist`; the ticket must verify the packaged executable/installer rather than infer success from a source-file move. Source: `apps/gui/package.json`, root `package.json`, and the ticket body.

## Implications

- Relocate the logo to a renderer-owned asset location and import it into the Welcome screen, retaining meaningful alt text and responsive CSS. The README can reference that tracked asset with a repository-relative Markdown image; marketplace manifests are out of scope because their schema does not support a logo.
- Replace the synthetic ICO generation/input with a deterministic multi-resolution ICO derived from the supplied square icon, then retain the resulting `apps/gui/build/icon.ico` as electron-builder's build resource and as the development window icon. Do not ship the 1.35 MB source PNG as an extra runtime resource merely to set the Windows icon.
- The move must remove both root-level PNGs, update any generation/documentation command needed to make the icon reproducible, and add focused rendering/build assertions. Packaging and a manually inspectable launched packaged app remain the authoritative acceptance evidence.
- The known GUI capture limitation tracked by GUI-091 may prevent an agent from taking the requested running-window screenshot. That limitation does not change the asset implementation; its proof should record the limitation and obtain human visual confirmation if an actual screenshot remains required.

## Open questions

- None that require a user decision. The ticket specifies the intended split: the supplied square asset becomes the app/installer icon and the supplied wide asset becomes visible product/README branding.
