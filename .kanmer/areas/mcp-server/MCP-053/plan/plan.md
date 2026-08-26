# Plan

1. Add a bounded `resume` request that must exactly name the ticket's recorded branch and worktree.
2. Keep existing refusal for a taken ticket unless the request exactly matches those recorded values.
3. Make the execution skill split fresh and resumed packets: validate/reuse the recorded branch and worktree, and never call `git worktree add` or `take_ticket` for a resumed packet.
4. Prove exact resume, mismatched refusal, and the full skill resume contract; update the managed AGENTS convention and its shipped mirror.
5. Build, run the full suite and plugin synchronization, then update PR #282 for independent re-review.
