opened PR https://github.com/collisionengineers/kanmer/pull/61 (branch `gui-065-welcome-update-status`, worktree `.worktrees/gui-065`, commit `17581bf` off `origin/main` at `d1ef063`).

Evidence artefacts live in the machine-local scratchpad
`%TEMP%/claude/C--Users-PC-Documents-GitHub-kanmer/33647913-…/scratchpad/gui065/`:
`makefeed.mjs` (dummy feed), `serve.mjs` (local HTTP feed), `evidence.mjs` (live
CDP DOM/layout dump), `pixels.mjs` (headless-Chromium pixels over the built
bundle), `live-electron-evidence.txt`, `live-electron-inproject.txt`, and the
four PNGs. They are copied into the ticket's `proof/` folder at verify time.
