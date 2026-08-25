# Plan — GUI-139

1. Reproduce the persisted default-profile reload failure in a focused test.
2. Split safe profile structure validation from runnable-completeness validation: persistence may contain the exact empty defaults the GUI creates, while save/start/doctor continue to require complete safe values.
3. Prove malformed populated values remain rejected.
4. Run focused tests, GUI typecheck, full workspace typecheck, and diff checks.
5. Commit, open PR, obtain independent review, merge, and verify the exact installed artifact can reconcile the existing settings file.
