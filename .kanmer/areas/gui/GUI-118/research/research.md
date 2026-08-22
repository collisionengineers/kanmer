# GUI-118 research

CORE-043's fresh independent review at `1126253eed586111db60ed72eccf6754f0f5ef06` found provider/lifecycle gaps: native branch binding is not verified, Git Retry can clear provider failures without retrying, openProject/preferences/Connect are not fully serialized, failed rename can persist the requested branch early, observed handoff does not mark native providers stale, reconnect state is not user-scoped, and push-recovery warnings can lose the required handoff instruction.

The safe boundary is to reuse the existing sync lifecycle lock, provider registration seams, and settings state. Add production-caller regressions and fail closed on races or incomplete handoff state. Do not broaden user-global provider ownership or claim live host proof.
