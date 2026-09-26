# 04 — decideTurn: one Jev call walks a fresh message to a reply, question or handoff

**Spec:** `.scratch/jevbot-v1/spec.md`. The key sections are "Thresholds config", "The one Jev call per message" and "The decision function". Jev facts: `docs/research/jev-api.md`.

**What to build:** The heart of the bot, as a pure function `decideTurn`. Given the valid topics, the conversation's recent messages and latest customer message, the config and an injected Jev, it makes exactly one Jev call and walks the matched topic's flow to its outcome. It returns:

- the bot reply (text plus optional buttons);
- the new status;
- a waiting step, when it ends on an ask_customer step;
- a handoff record (reason text and source), when it hands off;
- a trace of every step visited with the answer, confidence, threshold and outcome;
- the Jev call record.

This ticket covers fresh messages only. Resuming a waiting step, and the rules for resolved and handed-off conversations, come in 06.

- **Thresholds config** (one config file, as the brief requires):
  - Careful, Balanced and Confident presets, each with `act`, `confirm` and `rule` thresholds. Use the values in the spec. Balanced is active.
  - The fallback mode (`reply` or `hand_off`, default `reply`), the fallback reply text and the fallback's handoff rules (default: "the customer asks to talk to a person").
  - The default handoff message.
  - The recent-message window (default: 6).
- **Question building:** all in one call.
  - A `topic` Choice over every valid topic plus `other`. Each option's description carries the topic's name, description and examples.
  - A Choice for every branch in every topic, with `not_stated` added using a standard description.
  - A Noul for every handoff rule in every topic and for the fallback rules. Each rule's condition is wrapped as a yes/no question about the conversation.
  - Namespaced question keys, lowercase types, and a structured state holding the recent transcript (the bot's own messages included) and the latest message.
  - Export the question building (the Jev request for a set of topics and a conversation) as well as using it inside `decideTurn`. The flow builder's "See what Jev gets" page (`.scratch/flow-builder/issues/08-see-what-jev-gets.md`) reuses it. Tests still go through `decideTurn`.
- **Walking the flow:**
  - `check_rules`: `matched` if any of its rules is at or above `rule`.
  - `confidence_gate`: compares the topic answer's `confidence` with `act` (high) and `confirm` (medium). Below `confirm` is low.
  - `branch`: follows the chosen path, but a `confidence` below `act` is treated as `not_stated`.
  - `send_reply`: emits its text and optionally marks resolved.
  - `ask_customer`: emits the question and buttons and returns the waiting step.
  - `hand_off`: emits its message and returns a handoff record with the step's reason tag plus context, such as which rule fired and its probability.
  - A safety cap limits the steps walked per turn.
- **Fallback when the topic is `other`:**
  - In `hand_off` mode, hand off.
  - In `reply` mode, hand off if a fallback rule is true. Otherwise send the fallback reply with a "Talk to a person" button.
- **Jev failure:** return a polite "please try again" reply, keep the conversation state unchanged, and include the error in the Jev call record.

**Blocked by:** 03 — Flow graph validation

**Status:** ready-for-agent

- [ ] All tests go through `decideTurn` with a fake Jev that records the questions it receives and returns canned answers. No test reaches into private helpers.
- [ ] Tests check the question set:
  - every valid topic plus `other` is in the topic Choice, and invalid topics are absent;
  - every branch includes `not_stated`;
  - every rule and fallback rule is a Noul;
  - types are lowercase;
  - the recent-message window is respected.
- [ ] Tests check the topic gate: high confidence reaches the expected `return_policy` reply; medium reaches the confirmation ask with Yes/No buttons; low hands off.
- [ ] Tests check the rules: a rule at the threshold hands off with that rule named in the reason; a rule just below it doesn't.
- [ ] Tests check the branches: a confident branch answer takes its path; a low-confidence branch answer is treated as `not_stated` and leads to the ask, and the trace records that.
- [ ] Tests check `damaged` hands off with the reason tag, and `unworn` marks the conversation resolved.
- [ ] Tests check the fallback: `other` in `reply` mode gives the fallback reply with a "Talk to a person" button; `other` with the "asks for a person" rule true hands off; `hand_off` mode hands off.
- [ ] A test shows that switching the active preset changes the outcome for the same answers.
- [ ] A test shows that a Jev error gives the retry reply and no state change.
- [ ] `npm run check`, `npm run lint` and `npm test` pass.
