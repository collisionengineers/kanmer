# 3.1 Ticket popout — M (request #1)

- **Where:** `Editor.tsx:353-364` (the `<aside className="editor">` docked/resizable panel → modal), `App.tsx:574-593` (render slot), `styles.css`.
- Wrap the editor body in `.modal-backdrop` + a new `.modal.editor-pop` (≈760px, `max-height:88vh`); drop the width-drag state + `.editor-resize` (`Editor.tsx:355-363`); add a focus-trap (copy `Settings.tsx:69-99`). Backdrop `onClick` and Escape (`App.tsx:345-350`) both route through **`trySelect(null)`** so the dirty-guard (`App.tsx:94-102`, discard modal 625-646) still fires; inner click `stopPropagation`. The editor body (`.field`, `.field-row`, `.doc-tabs`, `.editor-foot`) is reused verbatim inside the modal.
