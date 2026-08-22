# Checklist — GUI-109

- [x] Read GUI-109 ticket, linked GUI-013 packet, HZN-007 context, FRD-001, links, and live gates.
- [x] Confirm GUI-013's historical proof leaves Add to group as an explicit gap.
- [x] Confirm existing ProjectClient/IPC/core updateItem(groups) contract is the only membership write path.
- [x] Add deterministic group-menu helper and tests.
- [x] Wire active group discovery into the ticket card context menu.
- [x] Preserve existing memberships by re-reading latest ticket before append.
- [x] Disable already-assigned groups and render an explicit empty-group state.
- [x] Keep unknown-group validation in core; add no duplicate storage/model.
- [x] Update docs/manual/groups.md and regenerate the in-app manual.
- [x] Run focused GUI group-menu tests.
- [x] Run full GUI tests and retain exact counts/exits.
- [x] Run manual freshness check and retain its exit.
- [x] Run GUI typecheck and build and retain exits.
- [x] Write post-implementation report with exact commands, failures, and boundaries.
- [x] Update ticket commits/PR traceability and open the PR.
- [x] Move Implementing → Review after a fresh get_doc_gates readback.
- [x] Record visual Electron card-menu/screenshot evidence as INCONCLUSIVE if no controlled desktop proof is available.

## Parked (explicitly deferred)

The live Electron card-menu interaction and screenshot are parked as INCONCLUSIVE until a controlled interactive Windows GUI session is available. Deterministic tests, typecheck, build, manual freshness, and source/diff evidence do not promote this item to visual PASS.
