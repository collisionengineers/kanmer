# Research

GUI-122 integrated GUI-119 into the pre-GUI-120 GUI-118 branch. The merge
therefore dropped GUI-120's two-project Connect broadcast regression and its
test seams, even though provider branch propagation remained intact. GUI-123
must integrate the GUI-120 merge (`37740379552e241f200bb181a2ca0e9d3be32ece`)
into the GUI-122 branch and prove both behaviors together.

## Acceptance evidence

- `projectId: id` broadcasts and the GUI-120 multi-project production-caller
  regression remain present.
- GUI-119 OpenAI, remote, and Claude `KANMER_BOARD_BRANCH` propagation remains
  present.
- The focused lifecycle/provider/connect/index-sync rail passes on the exact
  resulting cumulative head.
