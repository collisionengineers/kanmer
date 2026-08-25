# Plan — CORE-105

1. Preserve the hosted 20.789-second failure and neighboring exact-head passes.
2. Confirm the test performs multiple real Windows atomic-write/rename operations and no product assertion failed.
3. Raise only this test’s timeout to 30 seconds, above the measured slow run but still bounded; do not change implementation or assertions.
4. Run the exact focused test repeatedly, the full core suite, typecheck, and hosted Windows CI.
5. Review, merge, verify, and close before release.
