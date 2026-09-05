---
kind: proof-record
merged_sha: "32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507"
environment: "detached verification worktree .worktrees/verify-gui-152-32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507 at exact merge SHA; Windows, Git Bash, Node v24.15.0, npm 11.14.1"
verified_at: "2026-09-05T03:40:00Z"
result: PASS
attempts:
  - attempted_at: "2026-09-05T03:15:00Z"
    command: "gh pr view 323 --json state,mergeCommit,url"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "state MERGED; mergeCommit.oid 32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507, matching the ticket's authorised PR."
  - attempted_at: "2026-09-05T03:26:00Z"
    command: "gh run list --workflow pr.yml --event push --commit 32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507 --limit 5 --json databaseId,headSha,event,status,conclusion,url,createdAt"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "One push-event run found, databaseId 33941825803, headSha exactly the merge SHA, status in_progress at read time."
  - attempted_at: "2026-09-05T03:26:05Z"
    command: "gh run watch 33941825803 --exit-status"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "Run reached status completed, conclusion success."
  - attempted_at: "2026-09-05T03:36:05Z"
    command: "gh run view 33941825803 --json jobs,conclusion,status,headSha,url,createdAt,updatedAt"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "Run conclusion success; job verify (databaseId 101240638583) completed/success, headSha 32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507, step 'Run the authoritative verification rail' success. This is the npm run verify receipt for the exact merge SHA (HZN-009)."
  - attempted_at: "2026-09-05T03:18:00Z"
    command: "git worktree add --detach .worktrees/verify-gui-152-32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507 32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507 (worktree pre-existed; asserted instead)"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "git -C <worktree> rev-parse HEAD == 32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507; symbolic-ref --short -q HEAD exit 1 (detached, confirmed); status --short --branch clean, ## HEAD (no branch)."
  - attempted_at: "2026-09-05T03:19:00Z"
    command: "npm ci"
    cwd: ".worktrees/verify-gui-152-32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507"
    exit_code: 0
    result: PASS
    summary: "647 packages added, audited 652; no error. Own log: %TEMP%/gui152-npmci not separately retained, console tail captured in verifier transcript."
  - attempted_at: "2026-09-05T03:19:30Z"
    command: "npm run build"
    cwd: ".worktrees/verify-gui-152-32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507"
    exit_code: 0
    result: PASS
    summary: "core (dist/*.js via tsup ESM) and mcp-server (dist/standalone/*.cjs) build succeeded, needed so @kanmer/gui can import core's dist types."
  - attempted_at: "2026-09-05T04:31:05Z"
    command: "npm run test -w @kanmer/gui"
    cwd: ".worktrees/verify-gui-152-32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507"
    exit_code: 0
    result: PASS
    summary: "57 test files, 646 tests, all green — exact match to the post-implementation report and the reviewer's independent run. Log: /c/Users/Alex/AppData/Local/Temp/gui152-test.log"
  - attempted_at: "2026-09-05T04:36:00Z"
    command: "npm run typecheck -w @kanmer/gui"
    cwd: ".worktrees/verify-gui-152-32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507"
    exit_code: 0
    result: PASS
    summary: "tsc --noEmit clean on tsconfig.node.json and tsconfig.web.json. Log: /c/Users/Alex/AppData/Local/Temp/gui152-typecheck.log"
  - attempted_at: "2026-09-05T04:36:30Z"
    command: "npm run build -w @kanmer/gui"
    cwd: ".worktrees/verify-gui-152-32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507"
    exit_code: 0
    result: PASS
    summary: "electron-vite build succeeded: main, preload and renderer bundles built. Log: /c/Users/Alex/AppData/Local/Temp/gui152-build.log"
  - attempted_at: "2026-09-05T04:37:00Z"
    command: "npm run verify:docs"
    cwd: ".worktrees/verify-gui-152-32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507"
    exit_code: 0
    result: PASS
    summary: "PASS — document mirror, 3 remote chapters, 26 doctor ids, links/fences/canary/provider boundaries, generated manual current. Log: /c/Users/Alex/AppData/Local/Temp/gui152-verifydocs.log"
  - attempted_at: "2026-09-05T04:37:10Z"
    command: "npm run check:manual"
    cwd: ".worktrees/verify-gui-152-32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507"
    exit_code: 0
    result: PASS
    summary: "manual: up to date (22 chapters). Log: /c/Users/Alex/AppData/Local/Temp/gui152-checkmanual.log"
  - attempted_at: "2026-09-05T04:38:00Z"
    command: "manual: pixel comparison against approved-ui/previews/ (desktop/laptop/mobile) and real-pointer interaction (live drag, hover states, live prefers-reduced-motion and <=900px behaviour)"
    cwd: "n/a — no process ran"
    exit_code: null
    result: INCONCLUSIVE
    summary: "This lane has no way to drive an interactive Electron window or capture a frame. No fabricated result recorded. The implementer's post-implementation report and the independent reviewer's scratch/review.md (open question 8) both name this exact gap and assign it to GUI-153/UI-D as residual risk, not a GUI-152 obligation."
receipts:
  - kind: github-actions-run
    provider: github
    repo: collisionengineers/kanmer
    workflow: pr.yml
    event: push
    run_id: 33941825803
    attempt: 1
    head_sha: "32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507"
    job: verify
    conclusion: success
    url: "https://github.com/collisionengineers/kanmer/actions/runs/33941825803/job/101240638583"
    covers: ["npm run verify"]
    observed_by: "claude-code verifier (HZN-009)"
---

# Proof — GUI-152 (Focus Board — scopes, bounded columns and sidebar)

## What the receipt satisfies

The push-to-`main` `verify` job on run `33941825803`, job id `101240638583`,
ran the authoritative verification rail (`npm run verify`) against the exact
merge SHA `32aa54fc0c7fa4dfafee2eeb57ec8bf60dbdc507` and concluded `success`
in just over 10 minutes. Per HZN-009's evidence rule, this hosted run is
consumed as the authoritative discharge of the full `npm run verify`
obligation for this exact merged tree; nothing further needed to be run to
cover that obligation.

## What the worktree checks satisfy

Per the ticket's own scoped-check plan (mirrored by the reviewer's independent
run), the detached worktree at the exact merge SHA additionally confirmed,
directly, the GUI-scoped subset most relevant to this ticket's acceptance:
`npm ci`; `npm run build` (core + mcp-server, a prerequisite for the GUI test
suite to import core's dist types); `npm run test -w @kanmer/gui` (57 files,
646 tests, all green — an exact match to both the implementer's report and the
independent reviewer's own run at `8ef01486`, which `git diff 8ef01486
32aa54fc -- apps/ docs/` confirms touched no reviewed byte); `npm run
typecheck -w @kanmer/gui`; `npm run build -w @kanmer/gui`; `npm run
verify:docs`; `npm run check:manual`. All exit 0. This corroborates the hosted
receipt with an independently-run subset rather than substituting for it.

## What remains uncovered, and why it does not block Done

Pixel fidelity against `approved-ui/previews/` (desktop/laptop/mobile) and any
check requiring a real pointer (live drag, hover states, the live behaviour of
`prefers-reduced-motion` and the ≤900px media query) are not covered by any
automated check, by the implementer's throw-away jsdom render, by the
independent reviewer (who explicitly could not drive Electron in their lane
either), or by this verifier's worktree, which likewise cannot drive an
interactive Electron window.

This is not a silent gap: GUI-152's own acceptance text names "manual pass on
a small board, the live board, an empty filtered scope and retired non-PASS
records" — which the post-implementation report's live jsdom pass and the
independent reviewer's arithmetic cross-check both satisfy — while explicitly
carving pixel/pointer fidelity out to **GUI-153 (0.5.0)**, listed under the
ticket's own "Out of scope" section ("packaged-renderer qualification against
the desktop/laptop/mobile previews"). The independent reviewer's
`scratch/review.md` reaches the same conclusion at "open question 8" and
issues a `pass` verdict with this exact residual risk named, not hidden.
Under this ticket's acceptance criteria, the manual pixel/pointer pass is
GUI-153's obligation, not GUI-152's, so its absence here is consistent with a
truthful PASS rather than grounds for INCONCLUSIVE.

## Checklist disposition

38 of 40 original checklist boxes were already ticked by the implementer with
supporting evidence reproduced above; the one substantively unchecked box
("Draft PR opened...") is now ticked with the PR's merged state as evidence.
One new explicit "Not ticked" item was added naming the pixel/pointer gap by
name, so the checklist accurately reflects both what is proven and what is
knowingly deferred to GUI-153.

## Result

**PASS.** The hosted receipt discharges `npm run verify` for the exact merged
tree; the worktree checks corroborate the GUI-scoped subset directly; the one
uncovered surface is explicitly named, explicitly owned by GUI-153, and does
not fall inside GUI-152's stated acceptance.
