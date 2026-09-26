# 06 — Multi-turn: waiting on ask_customer

**Spec:** `.scratch/jevbot-v1/spec.md` (see "The decision function", rules 1, 2, 4 and 7).

**What to build:** Conversations continue across messages. When the bot has asked a button question, the customer's next message (tapped or typed) answers it from the same single Jev call, and the flow carries on. `decideTurn` gains:

- **Waiting on an ask_customer step:**
  - First, check the waiting topic's handoff rules. If any rule is at or above `rule`, follow that `check_rules` step's `matched` connection and hand off.
  - Otherwise, if the waiting branch's answer is `not_stated` and the topic answer is a different topic at or above `act`, drop the waiting step and start that topic's flow fresh.
  - Otherwise, resume at the waiting branch with its answer. A low-confidence answer is treated as `not_stated`, as usual. The walk continues through any later steps in the same turn.
- **Repeat-question cap:** if the walk would ask the same ask_customer step the conversation was just waiting on, hand off instead. Use the default handoff message and the reason "unanswered: <question>". A question is never asked twice in a row.
- **Resolved conversation:** the next message is treated as fresh, and the status goes back to open.
- **Handed-off conversation:** make no Jev call. Save the message and repeat the handoff message.

**Blocked by:** 05 — Chat with saved conversations

**Status:** ready-for-agent

- [ ] Tests through `decideTurn` with a fake Jev cover:
  - resuming a waiting branch takes the answered path in the same turn;
  - after a Yes to the medium-confidence confirmation, the walk continues into the condition branch in the same turn;
  - a rule firing while waiting hands off;
  - a confident different topic while the branch is `not_stated` switches topics;
  - a second unclear answer hands off as "unanswered";
  - a resolved conversation starts fresh;
  - a handed-off conversation makes no Jev call.
- [ ] Manual demo in `/chat` with real Jev: "can i return shoes i bought last week?" gets "Has it been worn or used?" with buttons. Tapping "No, it's unworn" gets the return-steps reply and the conversation is resolved.
- [ ] Manual demo: while waiting on a return question, asking "how long does shipping take?" switches to `shipping_times`.
- [ ] Manual demo: after a handoff, further messages get the handoff message, and no new Jev call appears in `jev_calls`.
- [ ] `npm run check`, `npm run lint` and `npm test` pass.
