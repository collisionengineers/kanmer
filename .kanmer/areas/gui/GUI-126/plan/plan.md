---
kind: plan
ticket: "GUI-126"
profile: fix
---

# Plan — restore submenu parent focus

## Scope

Fix the documented ContextMenu keyboard defect: ArrowLeft from an open submenu must close that submenu and return focus to its parent menu item, while root Escape and click-away dismissal continue to close the whole menu. Add assertions that prove the focus transition and update FRD-019 R6 only to the behavior actually covered.

## Implementation

1. Read the current ContextMenu component and its menu test helpers; preserve the existing portal, placement, role, and dismissal behavior.
2. Thread explicit parent-item focus metadata through submenu rendering and handle ArrowLeft locally at the submenu boundary.
3. Add focused keyboard tests for parent restoration and regression coverage for root dismissal; run the focused and renderer suites.
4. Update the FRD-019 R6 evidence after the tests pass, without broadening into unrelated menu features.

## Verification

- Focused ContextMenu tests prove ArrowLeft returns focus to the parent item.
- Existing renderer tests remain green and no assertion is weakened.
- FRD-019 R6 matches the shipped behavior and linked test evidence.

## Stop condition

Stop at Review with the recorded worktree/branch, post-implementation report, exact checks, and PR linked to GUI-126. Do not merge or self-review.
