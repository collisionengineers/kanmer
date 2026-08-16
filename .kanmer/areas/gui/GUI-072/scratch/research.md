## Headless probe (read-only, scratchpad only)

Rendered the real `styles.css` + the real markup shapes in headless Chromium
(playwright already cached in `.ds-sync/node_modules`, machine-local). Measured:

| site | label `display` | input computed width | label height |
|---|---|---|---|
| Settings `.check` (in `.modal.settings .settings-pane`) | `inline` | **866px** | 37px (2 lines) |
| BacklogTable `.check` (in `.backlog-actions`, a flex row) | `block` | **94px** | 38px (2 lines) |
| TicketCreate `.check-row` | `flex` / `align-items:center` | **13px** | 19px (1 line) |

Screenshot reproduced the reported symptom exactly: the checkbox glyph paints
centred inside the stretched control, so it reads as "floating up and to the
right" above its label text. `.check-row` renders correctly.

Probe artefacts (not in the repo):
`%TEMP%/claude/.../scratchpad/gui072/{probe.mjs,probe.html,probe.png}`
