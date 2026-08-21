## Independent review — DOC-013 @ d187200b

**NEEDS CHANGES.** Current content is secret-safe and makes no unsupported public/Worker success claim: it clearly defers MCP-028 evidence, keeps the OpenAI path separate, and the exact 26 doctor ids are present once in registry order. Generated manual and focused/full rails are green: verify:docs PASS (3 chapters/26 ids), check:manual PASS (22 chapters), npm test PASS (core 256, GUI 337, HTTP 61, scripts 66), typecheck PASS, GUI build PASS, diff check PASS.

Remaining blockers are documentation-contract/evidence gaps:

1. `docs/manual/remote-access-troubleshooting.md` has only four columns (id, mode/layer, pass meaning, one repair/rerun). DOC-013 plan/files require each of the 26 entries to include safe observed/expected fields, likely causes, ordered repairs, relevant status/log location, rerun mode, and stop/escalate condition. The checklist explicitly leaves this item unchecked; the generic Safe escalation paragraph does not satisfy per-check coverage.
2. The report/checklist leave required command evidence unchecked: no disposable packaged token/remote/doctor runs (including a path with spaces), no safe stop/cleanup walkthrough, no every-documented-command/platform result, no GUI/manual walkthrough, and no secret/canary scan/traceability record. The report’s build/test/typecheck evidence does not prove the documented CLI workflow.
3. `scripts/verify-docs.mjs` does not implement the planned verifier scope: it checks patterns only in the provider-neutral overview, does not validate relative links/anchors/code fences, does not perform the required unique canary/disposable-output check, and does not scan the troubleshooting/provider/generated content for secret/insecure patterns. Current files are clean, but the new gate would not protect the stated contract.

Please complete the matrix/evidence and strengthen the docs verifier (or explicitly narrow/reconcile the plan/checklist), then re-review. No merge performed.
