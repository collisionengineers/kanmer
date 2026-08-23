# Verification blocker — CORE-078

The recorded PR #199 merged as f44b6fd842488ee363b561fa1bc7e40d7ebcad7b into the CORE-060 branch, not origin/main. git merge-base --is-ancestor f44b6fd842488ee363b561fa1bc7e40d7ebcad7b origin/main fails. The shipped merged-main contract is therefore unavailable; remain Verifying and do not write a PASS proof or clean the still-recorded branch/worktree until the CORE-060 stack reaches main.
