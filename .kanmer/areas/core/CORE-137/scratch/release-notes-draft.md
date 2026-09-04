# Draft — `## 0.4.1` section for `apps/gui/release-notes.md`

Status: draft written 2026-09-04 before GUI-150 and CORE-119 merged. Every bullet is checked against the ticket's post-implementation report at step 4 of the plan; bullets marked *(pending)* are rewritten from the merged change.

## 0.4.1

A repair release. 0.4.0 blinded one agent host, left another on the previous plugin, wrote machine-specific paths into consuming repositories, and ran its own full verification rail on every board push. 0.4.1 fixes each of those, tightens the skills' review discipline, and adds the proof harness the next promotion will run on. No new feature.

### Fixed

- **Tool results are whole again in Claude Code.** Every tool result now mirrors the full payload in `structuredContent`, so a client that prefers structured output shows the complete result instead of the three-field project stamp (MCP-055).
- **Claude Connect leaves the plugin installed, current, and loaded.** The marketplace is staged under `%LOCALAPPDATA%\Kanmer\claude-marketplace` instead of a temp directory that was deleted behind Claude Code's back; an already-installed plugin is forced to the bundled version (GUI-147). Connect then reads the host's own `claude plugin list --json`: a plugin the host reports as failed to load or disabled fails Connect with the host's words and the pasteable repair, and Settings shows the same error until it clears (GUI-150).
- **Provider registrations are portable and gitignored.** Claude Code and OpenCode project registrations use the stable launcher instead of absolute `Kanmer.exe` and board paths, so a registration committed by one machine works on another; Connect gitignores what it writes and reports a legacy absolute registration as behind (GUI-149).
- **The home-directory endpoint registry is no longer mistaken for a board.** A `.kanmer` folder counts as a board only when it carries the board markers; a registry-only `~/.kanmer` beside the temp folder no longer captures discovery or hangs the HTTP tests (MCP-056).
- **Reconciliation recovers abandoned claims whose workspace is missing or unrecorded**, and a verified FAIL is routed only when its proof names the current merge SHA (`PROOF_MERGE_SHA_MISMATCH` otherwise) (CORE-133).
- **A board push no longer runs the full verification rail.** The re-gate dispatch runs only the gate job, dispatch bursts coalesce, a board push with no open pull request dispatches nothing, and the required `verify` check runs for pull requests and pushes to `main` only (CORE-139).
- **Shipped artefacts no longer break the repositories Kanmer is installed into.** The `kanmer-setup` skill no longer links outside its own folder (the link turned consuming repositories' documentation checks red), and the canonical AGENTS.md operating block's truncated sentence is complete; `verify:skills` now refuses any shipped skill link that escapes its skill folder (CORE-139).

### Skills and policy

- **The anti-churn amendment is in the skills and the core.** Review findings that the change has already made obsolete carry an `obsolete-after-change` disposition; findings are grouped by root cause; `kanmer-verify`, `kanmer-closeout` and `kanmer-auto` use `reconcile_ticket` / `apply_reconciliation` rather than re-deriving state; and a reviewer re-checks the pushed board before merging. One review, one remediation, one delta review is now the written budget (SKILL-039).
- **Skill link hygiene is a rail check.** Shipped skills may link only inside their own folder (CORE-139).

### Proof

- *(pending)* **Golden-board evaluations and a promotion/rollback rehearsal.** Disposable golden boards exercise the controller, lease, batch, capture, delivery, review, reconciliation and multi-project paths against a candidate server, and a scripted promotion proves a candidate can replace the stable control plane and be rolled back (CORE-119). Final wording from CORE-119's post-implementation report.
- **Test harness failures are loud.** A validator that fails to spawn (empty output) now fails the test instead of passing as "non-zero exit", which is how one Windows spawn failure masqueraded as a regression (CORE-139).

**Upgrading from 0.4.0:** install, then open Settings → Connect for each agent host. Claude Code's plugin is reinstalled at 0.4.1 and its load state is read back; if the host reports an error, Connect prints the repair. Run `kanmer-setup` in each managed repository to refresh the skills and the AGENTS.md block, and commit the rewritten portable registration and the new `.gitignore` entries. Boards need no migration; a rollback to 0.4.0 needs no board change.
