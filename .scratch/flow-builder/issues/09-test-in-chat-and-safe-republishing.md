# 09 — Test in chat and safe republishing

**Spec:** `.scratch/flow-builder/spec.md` (section "Chat and eval use published topics").

**What to build:**

- **Test in chat.** "Test in chat" on the builder opens `/chat` in test mode for that topic. The topic's draft replaces its published version for that conversation only, and the other published topics are used as normal.
- **Invalid drafts.** If the draft is invalid, the chat explains that the draft has errors instead of running.
- **Marking tests.** Test conversations are marked in D1 and clearly labelled as tests in the chat. Any handoffs they create are labelled as tests on `/handoffs`.
- **Live conversations after a republish or unpublish.**
  - If a conversation's waiting step no longer exists in the current topics, or its topic isn't available any more, the waiting step is dropped and the next message is treated as fresh.
  - This is a new behaviour of `decideTurn`, tested at that seam with a fake Jev.

**Blocked by:** 05 — Draft and publish; v1 ticket 06 — Multi-turn: waiting on ask_customer; v1 ticket 07 — Handoffs page (`.scratch/jevbot-v1/issues/`)

**Status:** ready-for-agent

- [ ] A `decideTurn` test shows that a waiting step missing from the given topics is dropped and the message walked as fresh.
- [ ] Editing a published topic's draft and clicking "Test in chat" uses the draft's changes, while a normal `/chat` conversation still uses the published version.
- [ ] Test conversations are visibly labelled in the chat, and a handoff from one is labelled as a test on `/handoffs`.
- [ ] Unpublishing a topic mid-conversation and sending another message starts fresh instead of erroring.
- [ ] `npm run check`, `npm run lint` and `npm test` pass.
