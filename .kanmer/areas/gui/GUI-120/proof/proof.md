# GUI-120 merged-main proof

Mainline: implementation fe4ace06 and merge 37740379 are ancestors of merged origin/main a8cc6b01ca95340f1186bccc9770238036d080d8. PR #221 is included in the cumulative parent.
Governing refs: FRD-012, FRD-020, ADR-0016.

PASS: packet focused index.sync 11/11; GUI typecheck/build; scripts 89/89; docs; diff.
PASS: The exact cumulative independent review at 9519e2e8 recorded the provider/connect/index.sync/remote-manager rail 121/121, with GUI typecheck/build, scripts 89/89, docs/manual, and diff checks passing. including the two-project Connect regression and projectId:id broadcast.
PASS: CORE-043 PR #168 hosted verify and kanmer-gate PASS in run 32607472961; PR #168 then merged to main.
INCONCLUSIVE (preserved): inherited full-workspace typecheck mismatch; no hosted stacked checks or live packaged/native-host/protected mutation evidence.

Result: merged-main multi-project status broadcasts verified.

## Closeout traceability

- PR [#221](https://github.com/collisionengineers/kanmer/pull/221) — merged 2026-08-22T22:51:50Z.
- Final parent PR [#168](https://github.com/collisionengineers/kanmer/pull/168) — merged into `main` as `a8cc6b01ca95340f1186bccc9770238036d080d8` at 2026-08-23T00:22:40Z.
