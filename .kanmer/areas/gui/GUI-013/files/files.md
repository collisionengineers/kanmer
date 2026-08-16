# Where the change lands

| Path | Why |
|---|---|
| `components/Board.tsx` | Group chips on the card; `onFilterGroup` threaded through `BoardProps` -> `Board` -> `Card`. |
| `components/FilterBar.tsx` | The group dropdown and the "Open group" affordance; `Filters.group`. |
| `App.tsx` | The filter predicate, and the chip -> filter wiring. |
| `styles.css` | `.chip.group`. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `Board.tsx` (the `Card` memo, and AGENTS.md section 8 gotcha 9) | Card props must stay primitive or stable - a rebuilt object per render defeats the memo and re-renders the whole board on every dragover. |
| `App.tsx` filter predicate | Where every view's filtering already funnels, so one line makes the group lens apply to board, standup and archived alike. |
