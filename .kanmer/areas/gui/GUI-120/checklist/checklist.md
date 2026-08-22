# Checklist

- [x] Correct the loop payload to use each project id. The GUI-118 base already contained projectId: id; GUI-120 preserves that behavior and adds an explicit regression/comment so the review finding cannot regress.
- [x] Add and pass the two-project production-caller regression.
- [x] Run focused tests, typecheck, build, scripts, and diff checks; preserve the workspace typecheck baseline failure.
