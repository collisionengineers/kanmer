# GUI-119 research

CORE-043's exact-head review found three branch-propagation gaps: OpenAI tunnel construction omits the saved branch, remote-access child environments omit `KANMER_BOARD_BRANCH`, and Claude marketplace installation stages no project branch. The existing provider-owned invocation/environment seams must carry the selected branch without mutating user-global configuration or bypassing shell-safe argv handling.
