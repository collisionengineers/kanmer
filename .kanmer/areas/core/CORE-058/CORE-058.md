---
id: CORE-058
type: ticket
title: >-
  CORE-044 review remediation: reconcile board cache ignore and plugin artifact
  provenance
status: done
area: core
assignee: codex-core058-executor
profile: fix
stageEntered:
  preparing: '2026-08-22T13:21:11.027Z'
  implementing: '2026-08-22T13:24:34.315Z'
  review: '2026-08-22T13:33:52.602Z'
  verifying: '2026-08-22T16:35:29.764Z'
  done: '2026-08-23T00:42:04.422Z'
taken_at: '2026-08-22T13:24:57.195Z'
branch: core-058-board-ignore-plugin-artifact
worktree: .worktrees/core-058
labels:
  - pr-review
  - board-sync
  - artifact
groups:
  - HZN-007
links:
  - CORE-044
blocks: []
refs:
  - docs/functional/frd/FRD-027-project-declared-sources.md
  - docs/architecture/adr/ADR-0020-project-declared-source-trust.md
commits:
  - d50ddab17c33fcdc645f9c777a635cc2d72f26ee
  - b167b667c8aa1ee488cf239d7121a4584f86d2f4
  - a0acadee972d3359738d9cd4390098794f7d3b4d
  - 5f63636d64fa92b4dc682d910255e0552d4da35e
  - b1abac871da28522759d4e5582caa69d5cdb5cd5
  - 17cdb6684f204e36cb64668236a4bab0de7e55ac
  - b8d8a191161532e895fa399b6c95bf812dfdb2d0
  - d3eb3728d6dca7cdeebd72c251f8ee3e1c47934f9
  - f0de2628b15028b59679f332c09a204f414437f8
  - c90d056dd5d2b4b20b24ca25f7d6cde9c184f7b7
  - 14c2d0fd743a62cf20a2c24946954275ceda5c8b
  - a6231bb09cdc999b3904e703cffebdad3cdad6da
  - 217eba4515f0b9030d25ed9f0a86a10fd7418d0f
  - cc1cbf369b6f016ac661f9e32327a8cd4b48fac3
  - e966509c729194916d24194a87257cc1d39f308b
  - 37bc2265df46f609d1ddcd94ddf020e5a74941a2
  - 59e7e0feaf4968b05d3d17df35052c20b6d900cf
  - c8ee9a4e96c5e9d0268e21c59247db00ed958b0b
  - cbb152dae4effc6fe0db254a59639818e2915b44
  - 3b4ef44ace5d077c7e54d5ed289d477fa7f6b529
  - 9563c122a490f12df056918a4c7074143cfb7b62
  - 9abfc9f47b8acfa31ef57d5b30071f72de43497c
  - ceaab8d455fd198a3421fa73bbf361ec33df0bd0
  - d4dee4bb668d27a1942532d940eb6d4508a224ab
  - 271790e58c52a14fa4b3cec62f7146b6a67bcdcd
  - 5053af23b87fe591015b14042b920c4cf41259b4
prs:
  - '180'
  - '183'
  - '184'
  - '185'
  - '186'
  - '187'
  - '188'
  - '189'
  - '190'
  - '191'
  - '192'
  - '193'
  - '195'
  - '194'
  - '196'
archived: false
created: '2026-08-22T13:03:07.157Z'
updated: '2026-08-23T00:42:36.138Z'
---

Close CORE-044 review findings for release and board hygiene: add the sources cache rule to canonical board-worktree ignore creation and reconciliation, and rebuild the committed plugin artifact from a normal checkout so plugin:check is reproducible outside nested ticket worktrees. Add regression/evidence for existing and new board worktrees and exact artifact parity. Link [[CORE-044]].


## Closeout outcome

PR #180 (https://github.com/collisionengineers/kanmer/pull/180) merged 2026-08-22T16:34:41Z. Recorded merged-main proof on origin/main a8cc6b01; deterministic evidence and explicit INCONCLUSIVE boundaries are in proof.md.
