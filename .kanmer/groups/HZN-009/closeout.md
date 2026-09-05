# HZN-009 closeout — v0.4.2 cut (2026-09-05)

Observed at: 2026-09-05 ~19:41 BST (adoption detected) / report finalized ~20:05 BST.

**Route:** qualified standalone MCP + plugin/skills cut. Desktop installer carried forward on Electron 31.7.7 (end of support) with `sandbox: false`; no new runtime or security-posture claim is made for the desktop artifact this release. Runtime upgrade and IPC/sandbox re-qualification remain HZN-010 R2-DESKTOP.

**Adopted revisions:** runtime 0.4.2 (packaged, `%LOCALAPPDATA%\Kanmer\mcp\0.4.2-4920`, sha256 `20caa7551f8316524f9a54253597fa2826a9f9474962262c96cdc705e275a5bd`); 12 skill frontmatters at v0.4.2; managed AGENTS.md policy block at v0.4.2 (live `get_status.repo.upToDate: true` via the 0.4.2 server against the live board).

## M1 — coherent instructions: PASS

DOC-028 (bd368549, PR #321) and DOC-026 (37b83b14, PR #326) merged. Live `get_status` via the installed 0.4.2 server against the live board reports `repo.upToDate: true` (only the informational `board-config` compensation remains). Fresh-clone `plugin:check` at v0.4.2: 41 tools match, bundle bytes match, 12 skill frontmatters parse, isolated MCP handshake lists 41 tools.

## M2 — one heavy verification owner: PROCEDURAL

Named verifier Alex remains the sole merger and merge-authorisation owner for this horizon. No automated lock exists yet; the enforced heavy-verification permit is deferred to CORE-143 (R2/0.5.0). R1-LEASE remains explicitly procedural, unchanged from the preparation pass.

## M3 — matching truthful evidence: PASS (code) / PROCEDURAL (provenance)

`release_channel` attempt `main@2` recorded with the 12 included PRs (#321-#332), the 11 included tickets, the 4 published-asset sha256 digests, `verification_state: passed`, then completed. Independent `release.yml` tag-triggered CI run `33983890950` completed with conclusion `success`. `verify-release-assets.mjs 0.4.2 --remote-coherent` PASS. Provenance for the individual R1-roster ticket proofs remains observed by the `claude-code verifier (HZN-009)` subagent via `gh`, not by Alex directly — that split is unchanged by this cut; the human-owned control is Alex's merge authorisation (M2) and, for this release, publish/adoption authorisation.

## M4 — Done independent of ordinary deployment: PASS

Every R1 ticket (CORE-129, CORE-138, CORE-140, CORE-144, CORE-145, CORE-147, DOC-026, DOC-028, GUI-152, MCP-057) recorded `delivery_state: integrated` on merge to `main`, independent of this release action. The disposable scenario (AT-37) was run for real this time against the **installed** 0.4.2 route on a disposable `--root` board: `get_status` → `create_item` → `set_ticket_doc(plan)` → `get_doc_gates` → `move_item(backlog→preparing)` → `list_items` readback → `update_item(archived:true)` — every step confirmed correct (ticket `TICK-001` created, moved to `preparing`, found on readback, archived), temp root deleted after.

## M5 — actual host and safe adoption: PASS

- **B1 Publish:** `node scripts/release.mjs 0.4.2 --publish --release-commit 7a6e4375...` — first attempt crashed mid `electron-builder`/`signtool.exe` packaging under host resource pressure (no partial tag/release created, safe to retry); retry succeeded end to end. v0.4.2 tag pushed, GitHub release published (not draft, not prerelease), all 4 assets verified byte-identical, `/releases/latest` confirmed. Independent `release.yml` CI green.
- **B2 Release ledger:** `main@2` acquired → recorded → completed; `get_status.release` confirms it released with `verificationState: passed`.
- **B3 Fresh non-linked clone at v0.4.2:** `npm ci`, `plugin:check`, `mcpb:check` (built MCPB matches the published asset's exact byte size), `test:http -w @kanmer/mcp-server` (252/253 pass, 1 skip, 0 fail) — all green. Clone deleted.
- **B4 Host adoption:** two manual `Kanmer-Setup-0.4.2.exe /S` attempts were **withdrawn as the wrong instrument** — the installer's own safety guard (`installer.nsh` `customCheckAppRunning`, GUI-133) correctly refuses a direct silent install while the app is running, rather than silently killing it. Adoption instead went through the **sanctioned in-app updater** (`electron-updater`, `autoDownload: true`; the pending cache `%LOCALAPPDATA%\@kanmergui-updater\pending\Kanmer-Setup-0.4.2.exe` matched the published asset exactly) — the operator applied it via the app's own "Restart now" banner (`quitAndInstall`). Detected within ~5 minutes of a read-only poll: `0.4.2-4920` generation created, `current` junction repointed, registry `DisplayVersion` 0.4.2. Stable launcher (`kanmer-mcp.cmd --probe`) resolves healthy through it. A fresh session against the live board via the new generation confirms `server.version: "0.4.2"` with matching sha256, `repo.upToDate: true`, **`delivery.verification` present** (`{workflow: "pr.yml", jobs: ["verify"], event: "push"}`), and **`proofValidation` present** (`{mode: "report", source: "default"}`) — satisfies M1/AT-33. Claude plugin/marketplace restaged: the Kanmer-owned staging directory (`%LOCALAPPDATA%\Kanmer\claude-marketplace`) was refreshed from the new generation's bundled plugin files (same content the app's own Connect flow writes), then `claude plugin update kanmer@kanmer` moved the installed plugin cache from 0.4.1 to 0.4.2 (enabled, user scope).
- **B5 M5/AT-37 disposable mutation:** PASS — see M4 above.
- **B6 Rollback drill (AT-38):** reproduced the installer's own GUI-106 activation mechanism (junction swap: build `current.next` as a junction to the target generation, atomically replace the `current` reparse point, matching NSIS's own `mklink /J` + `RMDir` + `Rename` sequence) to repoint `current` from `0.4.2-4920` to the retained `0.4.1-7432` and back. Each direction confirmed via a fresh session's `get_status`: correct `server.version`/sha256, and the **live board** remained reachable with unchanged counts (398 tickets, 383 done) in both directions. `0.4.1-7432` was never uninstalled and remains on disk as the rollback target.

## Live-board inventory delta

OP-00 snapshot (2026-09-05 ~03:00 BST): 384 tickets + 30 archived = 414, backlog 10, preparing 1, done 373. Current: 398 tickets, backlog 14, preparing 0, implementing 0, review 1 (CORE-141 itself), verifying 0, done 383, archived 30, taken 1. Delta: all 10 HZN-009 R1 roster tickets (CORE-129, CORE-138, CORE-140, CORE-144, CORE-145, CORE-147, DOC-026, DOC-028, GUI-152, MCP-057) confirmed Done; several additional tickets (CORE-141 itself, CORE-144, CORE-145, CORE-147, GUI-154 among others) created/progressed since OP-00.

## CORE-129 proof census / `report`-mode decision

Census on a copied board (run twice, identical, copy deleted): `valid 2 / legacy 319 / invalid 2 (GUI-133, GUI-135) / absent 105 / total 428`, digest `proof-census-v1:59830aa1862824e92b79e670dd81b8fd21be11ad7573e99b3dd4028ac5afe818`. **Decision: the live board stays in `report` (non-strict) proof-validation policy for 0.4.2** — confirmed live via the 0.4.2 server's `get_status.proofValidation: {mode: "report", source: "default"}`. No strict cutover was run; the two invalid legacy records (GUI-133, GUI-135) need hand-repair first, out of scope for this release's roster.

## Rollback evidence

Retained generation `0.4.1-7432` under `%LOCALAPPDATA%\Kanmer\mcp\`, never uninstalled. Release ledger attempt `main@1` (v0.4.1, `4e94ad80`, verification passed) remains the prior known-good published release with its full asset-digest manifest. B6 above is the real rollback-drill evidence for this cut. Release ledger attempt `main@2` (v0.4.2, `7a6e4375`, verification passed) is now the current known-good published release.

## Unfinished → HZN-010

CORE-142 (gate-only hosted required check + blocking attestation, needs repository administration); CORE-143 (implemented heavy-verification permit, currently procedural); CORE-146 (scheduled, R2-EVIDENCE); GUI-153 (Focus Board UI-C+D); MCP-058 (smoke ready-packet flake); **GUI-154** (new, filed today: Windows `tinypool` worker-exit flake in `apps/gui` vitest, root-caused to host TEMP disk exhaustion from a disposable-test-board directory leak — `kanmerGit.test.ts`'s real-git suite does not fully clean up its own boards, 1→5 `kanmer*` temp dirs per run, 1,689 accumulated before this cut's cleanup); R2-DESKTOP (Electron runtime upgrade + IPC/sandbox re-qualification); R2-EVIDENCE remainder (receipt store, reuse key, provenance adapter beyond MCP-057+CORE-129+CORE-147); every Pegasus item (out of scope).

## Resume decision

0.4.2 is now the live control plane, adopted safely with a proven rollback path. CORE-141's own proof record follows this closeout (schema-2, `proof/proof.md`), after which the ticket moves Verifying → Done and closeout (worktree/branch removal, `take_ticket action: release`) completes.
