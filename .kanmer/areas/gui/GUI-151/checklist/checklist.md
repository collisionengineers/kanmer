# Checklist — GUI-151

- [x] Build the self-contained renderer-matched shell and representative seeded project/ticket data.
- [x] Wire project, view, filter, ticket, board-move, editor, document, activity, settings, palette, context-menu, theme, density, archive, and reset interactions.
- [ ] Validate browser rendering in dark and light themes and representative workflows; direct local-file navigation was refused by the available browser automation policy.
- [x] Validate embedded JavaScript syntax, the static six-stage/surface contract, and `git diff --check`.
- [x] Stop at the standalone mockup hand-off without changing production code or merging.

## Progress notes

- PASS: embedded inline JavaScript compiled with `new Function`.
- PASS: static contract check found all six stages plus palette and OpenAI tunnel surfaces.
- PASS: `git diff --check`.
- INCONCLUSIVE: direct `file://` browser navigation was rejected by browser security policy. No bypass was attempted.
- A jsdom interaction check was attempted but could not run because dependencies are not installed in this checkout; no package was added for this artifact.
