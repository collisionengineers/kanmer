# Plan — GUI-151: Create a fully interactive standalone Kanmer UI mockup

## Objective

Add one self-contained browser-openable HTML file that faithfully demonstrates the current Kanmer desktop shell with realistic seeded data and in-memory interactions.

## Starting state

The production renderer is a React/Electron surface composed by `apps/gui/src/renderer/src/App.tsx`, with layout and tokens in `styles.css`. Its user-facing contract is FRD-019: multi-project tabs, Board/Standup/Archived views, filtering, six workflow stages, ticket editing and documents, activity, settings, command navigation, and themed renderer-owned menus. No standalone mockup currently exists.

Evidence: production source and FRD inspected from the current `main` checkout on 2026-09-04; this chore has no required research/files documents.

## Governing docs

- **Meets** `docs/functional/frd/FRD-019-gui-shell.md` by reproducing its current shell, views, tab/filter semantics, editor, activity, settings, keyboard affordances, and dark/light theme tokens in a standalone demo. It does not modify the production contract.

## Required changes

- Add `apps/gui/kanmer-mockup.html` as a dependency-free HTML/CSS/JavaScript artifact.
- Match the current renderer hierarchy and visual tokens closely: project strip, top bar, filter bar, six stage board, area-grouped cards, badges, modal editor, drawers, menus, settings, and theme.
- Seed multiple projects and a varied ticket set spanning all stages, areas, assignees, groups, labels, taken/blocked/PR/document states, archived items, activity, and documents.
- Make the mockup fully interactive in memory: project/view switching, search and facets, ticket selection/edit/save, document/checklist tabs, add ticket, drag/drop and menu stage moves, archive/restore, activity navigation, standup, settings/theme/density, command palette, context menu, and reset.
- Keep all state local to the page; reload/reset restores the supplied fake dataset. No filesystem, network, Electron bridge, or new dependency.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Add | `apps/gui/kanmer-mockup.html` | Entire standalone mockup: markup, renderer-matched CSS, seeded data, and browser interactions. |

## Do not modify

- Production renderer implementation under `apps/gui/src/**`.
- Package manifests, build configuration, dependencies, board storage, or governing documentation.
- Existing untracked user files.

## Constraints

- Use only browser-native HTML, CSS, and JavaScript in one file.
- Use the current six fixed stages and current UI terminology.
- No persistence that could be mistaken for real Kanmer data; state is demo-only.
- Maintain usable layouts from approximately 1024px desktop width upward, with horizontal board scrolling below that.
- Buttons and keyboard shortcuts must expose meaningful labels/focus behavior; destructive mock actions remain reversible through reset.

## Ordered steps

1. Build the renderer-matched application shell and seed representative data in `apps/gui/kanmer-mockup.html`.
2. Wire all visible mock interactions to one in-memory state model, including board movement, editor/document changes, view/filter/project controls, drawers, dialogs, menus, keyboard shortcuts, theme and density.
3. Validate the standalone file in a browser, exercise representative workflows, inspect both themes and responsive overflow, and run a lightweight static/syntax check.

## Acceptance checks

- Opening `apps/gui/kanmer-mockup.html` directly shows a populated Kanmer board with all six stages and no server.
- Search/facets narrow column counts while the Board badge continues to count all non-archived tickets.
- Ticket create, edit, checklist toggle, movement, archive/restore, project switch, standup, activity, settings, context menu, command palette, theme, density, and reset all visibly work.
- No production source, dependency, build contract, or real data is changed.
- The file has valid embedded JavaScript and no console-breaking startup error.

## Commands

- `node --check <extracted-inline-script>` or equivalent syntax validation.
- Open `apps/gui/kanmer-mockup.html` in a browser and perform visual/interaction checks in dark and light themes.
- `git diff --check`.

## Failure and deviation rules

Stop and report if matching the current UI requires changing production code, adding a dependency, writing real project data, or touching a file outside the declared artifact.

## Stop condition

Stop after the standalone mockup is implemented and locally validated. Do not merge, release, or begin unrelated GUI work.
