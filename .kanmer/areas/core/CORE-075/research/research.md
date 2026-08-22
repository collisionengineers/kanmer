# Research

Fresh review of CORE-071 at cumulative head `c8ee9a4e` found stale packet prose
after CORE-074 merged. The implementation is append-only `O_APPEND`; the
ticket packet must describe that final behavior and preserve both the initial
test failure and corrected PASS evidence.
