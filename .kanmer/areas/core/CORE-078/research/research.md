# Research

CORE-060 review at exact head `fbb528734e43d2d86c24359b88395169f197506b` found that a successful manual retry can clear a paused sync state after the automatic timer has already been cleared, leaving the open project without future automatic sync. Governing scope: FRD-020 / ADR-0016.
