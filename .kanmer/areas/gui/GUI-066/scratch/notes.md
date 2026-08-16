**Operator decision, 2026-08-16.**

Two of the three questions answered, one declined:

- **Auto-republish on a detected gap — yes.** Verify assets, and on a gap re-run
  the publish and re-verify, failing only if the second pass still has a gap.
  The reasoning in the ticket holds: a refusal after the tag is pushed leaves
  `/releases/latest` broken until a human intervenes, which is precisely the
  state 0.3.1 shipped in.
- **Set `EP_GH_IGNORE_TIME` in the script — yes.** It was needed for both manual
  re-publishes, so the script should set it rather than depend on someone
  remembering.
- **Backfill v0.3.0's blockmap — no.** Not requested. It needs a rebuild of 0.3.0
  from its tag, and the cost falls only on clients still on that version. Record
  it as a known, accepted gap in the plan rather than leaving it looking
  forgotten — anyone still on 0.3.0 pays a full ~78 MB download on their next
  update, once, and is then current.

Note the auto-republish path needs a **bounded** retry: one re-publish, then
re-verify, then fail loudly. A loop that keeps retrying a genuinely broken upload
turns a visible failure into a hang.
