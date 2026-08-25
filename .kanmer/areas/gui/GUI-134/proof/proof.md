---
kind: proof-record
merged_sha: "62cafcf628609ad94e9ed1f3fadc3e37969f570e"
environment: "detached exact-merge Windows worktree plus packaged installer"
verified_at: "2026-08-25T04:23:00.000Z"
result: INCONCLUSIVE
attempts:
  - attempted_at: "2026-08-25T04:20:32.000Z"
    command: "npm run build:core; focused remote/preload/Settings tests; GUI typecheck; git diff --check"
    cwd: ".worktrees/verify-gui-134-62cafcf628609ad94e9ed1f3fadc3e37969f570e"
    exit_code: 0
    result: PASS
    summary: "Exact merge SHA passed core build, 3 focused files / 11 tests, GUI typecheck, and diff check."
  - attempted_at: "2026-08-25T04:21:00.000Z"
    command: "npm run dist"
    cwd: ".worktrees/verify-gui-134-62cafcf628609ad94e9ed1f3fadc3e37969f570e"
    exit_code: 0
    result: PASS
    summary: "Exact merge SHA produced the signed Windows NSIS installer."
  - attempted_at: "2026-08-25T04:22:30.000Z"
    command: "packaged Settings Save configuration then Create token"
    cwd: "installed Kanmer 0.3.7 built from exact merge SHA"
    exit_code: null
    result: INCONCLUSIVE
    summary: "Generation forwarding no longer failed, but end-to-end creation stopped at an independent Electron safeStorage platform-contract defect tracked by GUI-135."
---

# Verification — GUI-134

The exact merged source and packaged preload contain the intended generation forwarding. The end-to-end acceptance action cannot yet be declared PASS because the next protected-storage boundary fails independently. GUI-134 remains Verifying and is blocked by GUI-135; a later pass must retain all attempts above.

---

# Final verification — GUI-134

Result: PASS

Merge SHA: `62cafcf628609ad94e9ed1f3fadc3e37969f570e` (PR #259).

The earlier exact-merge attempts above remain part of the record. The independent safeStorage defect was fixed by GUI-135 without changing generation forwarding. On the installed exact GUI-138 artifact, remoteCreateSecret was invoked with the current configuration generation, protected bearer rotation succeeded, and the resulting runtime reached ready and passed the complete public doctor. This proves the generation traverses the renderer/preload/main boundary correctly.

The exact current packaged Windows installer loaded from installed `resources/app.asar`. Its public-mode doctor returned `ok: true`, `summary: pass`, and 26/26 PASS, including tunnel readiness, redaction, and no board mutation. No secret value, provider credential, or session identifier is recorded.
