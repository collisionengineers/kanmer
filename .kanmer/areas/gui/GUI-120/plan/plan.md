# Plan

1. Rebase/resume the GUI-118 lifecycle branch and inspect `connectProject`.
2. Change only the broadcast payload to use the loop's project id.
3. Add a regression with two open projects and run the focused Connect rail,
   typecheck, build, scripts, and diff checks.
4. Review and merge GUI-120 into GUI-118's branch, then re-review GUI-118.
