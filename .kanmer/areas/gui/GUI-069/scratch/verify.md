Verified on merged `main` @ `488797d` in the main checkout. Full rail green; `proof` written.

Two things worth recording that are not defects:

1. **GUI suite reads 209 on main vs 210 on the branch.** Not a lost test — merged main also carries PR #37 (`43dcedb`), which deleted one `it` from `manual/manual.test.ts`. `board.test.ts` is 25 tests on both sides (`git show 488797d:… | grep -c "  it("` == `git show 4936358:…`). Checked, not assumed.

2. **Running `npx vitest run <path>` from the repo *root* sweeps `.worktrees/`** and double-counts every GUI test (it reported 5 files / 101 tests, including `.worktrees/gui-069/…/board.test.ts`). `npm test` is unaffected — `npm run test -w @kanmer/gui` sets cwd to `apps/gui`, so it cannot reach the worktrees, and it correctly reported 21 files. Only an artifact of an ad-hoc invocation; the proof quotes the scoped run from `apps/gui`. Worth knowing before someone reads a root-level vitest count as real.
