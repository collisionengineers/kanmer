# Building with Kanmer UI — conventions

Kanmer is a dark-first desktop kanban (Electron + React). `@kanmer/ui` is the app's own screens, unchanged: build Kanmer-like tools by composing them, and style your own glue with the same CSS custom properties and global classes the app uses. There is no utility-class system and no CSS-in-JS — **one stylesheet (`styles.css`) + `var(--bg)`-style custom properties + a small BEM-ish global class vocabulary**.

## 1. Setup and wrapping

- Link `styles.css` once. It sets `body { background: var(--bg); color: var(--text); font: 13px/1.5 "Segoe UI", system-ui, sans-serif }` — Kanmer's ground is dark; put screens on it, not on white.
- **Wrap the tree in `<KanmerProvider>`** whenever you render `Board`, `Editor`, `Settings`, `Standup`, `ActivityPanel` or `TicketCreate`. They call `useClient()` and throw `useClient must be used within a ClientContext.Provider` without it. With no props it serves a seeded in-memory board (`demoBoard`, `demoItems`, `demoActivity`); pass `client={createDemoClient({ board, items, activity })}` for your own data, or any object implementing `ProjectClient`.
- `ChipInput`, `ConfirmModal`, `TabStrip`, `FilterBar`, `QuickAdd`, `CommandPalette`, `ArchivedList`, `Welcome` need no provider.
- **Theme:** dark is the default (`:root`). Light mode is `document.documentElement.dataset.theme = "light"` — it re-maps every token; never hard-code colours.
- Overlays (`Editor`, `TicketCreate`, `Settings`, `ConfirmModal`, `CommandPalette`) render a `position: fixed; inset: 0` backdrop — mount them at the top of the tree, conditionally (`{open && <Editor …/>}`), and give the app root a real height (`.app` is `height: 100%`).

## 2. Styling idiom — tokens + global classes

Tokens (all in `styles.css`; light values under `[data-theme="light"]`):
`--bg` (app ground) · `--bg-2` (cards, modals, topbar) · `--bg-3` (buttons, hover) · `--line` / `--line-2` (borders) · `--text` · `--muted` · `--accent` / `--accent-dim` · `--danger` · `--warn` · `--radius` (8px).

Global classes to reuse for your own layout (they are the app's real ones):
- Shell: `.app` (column flex, 100% height) › `.topbar` (`.brand`, `.tabs` › `.tab` / `.tab.active`, `.spacer`) › `.main` › `.content`.
- Board: `.board` › `.col-head` + `.cell` › `.card` (`.card.selected`, `.card-top`, `.card-id`, `.card-title`, `.card-labels`, `.card-assignee`, `.pri`).
- Lists/rows: `.list` › `.list-row` (`.list-id`, `.list-title`).
- Badges: `.chip` and its variants `.chip.subtle`, `.chip.link`, `.chip.taken`, `.chip.blocked`, `.chip.deploy`, `.chip.pr`, `.chip.dispatch`.
- Buttons are plain `<button>`; variants are classes: `primary`, `ghost`, `danger`, sizes `sm`, `xs` (e.g. `<button className="ghost sm">`).
- Forms: `<label className="field"><span>Label</span><input/></label>`, `.field-row` for two side by side; inputs/selects/textareas are styled globally.
- Dialogs: `.modal-backdrop` › `.modal` (`.modal-head`, `.modal-body`, `.confirm-actions`).
- Messages: `.banner`, `.banner.warn`, `.banner.info`, `.banner.error`, `.error`, `.empty`, `.hint`, `.toast-stack` › `.toast`, `.linklike` (button styled as a link), `.markdown` for rendered markdown, `.sr-only`.

Don't invent new class names — use these, or inline `style={{ background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--radius)" }}`.

## 3. Data shapes (props reference these by name)

- `BoardConfig`: `{ statuses: {id,name,color?}[]; areas: {id,name,color?,prefix?}[]; priorities: {id,name,color?}[]; idPrefixes: {ticket,plan,research}; deployment?: {environments: string[]}; docs?: … }` — `demoBoard` is a complete example (7 stages, 3 areas, 4 priorities).
- `Item`: `{ id, type: "ticket"|"plan"|"research", title, status, area, priority, assignee, labels: string[], links: string[], archived, body, created, updated, taken_at?, branch?, blocks?, refs?, commits?, prs?, deployment?, order? }` — `demoItems` has one of every chip state.
- Helpers exported for glue: `blockedIds(items, lastStageId)`, `columnCards(items, statusId)`, `columnName/columnColor(cols, id)`, `renderMarkdown(body, knownIds)`, `buildStandup/standupMarkdown`.

## 4. Where the truth lives

Read `styles.css` (the imported `_ds_bundle.css` is the whole app stylesheet, tokens first) before styling anything, and `components/<group>/<Name>/<Name>.prompt.md` for each component's props and verified examples.

## 5. Idiomatic build snippet

```jsx
const { KanmerProvider, Board, FilterBar, blockedIds, demoBoard, demoItems } = window.KanmerUi;
function App() {
  const [items, setItems] = React.useState(demoItems.filter((i) => !i.archived));
  const [selected, setSelected] = React.useState(null);
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState({});
  return (
    <KanmerProvider>
      <div className="app">
        <div className="topbar"><span className="brand">Kanmer</span><div className="spacer" /><button className="primary sm">New ticket</button></div>
        <FilterBar board={demoBoard} items={items} search={search} onSearch={setSearch} filters={filters} onFilters={setFilters} />
        <div className="content" style={{ overflowX: "auto" }}>
          <Board board={demoBoard} items={items} selectedId={selected} onSelect={setSelected}
            onMove={(id, to) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, status: to.status } : i)))}
            onMoveRelative={() => {}} onQuickAdd={() => {}} onContext={() => {}} blocked={blockedIds(items, "done")} />
        </div>
      </div>
    </KanmerProvider>
  );
}
```
