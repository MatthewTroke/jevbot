# 08 — See what Jev gets

**Spec:** `.scratch/flow-builder/spec.md` (section "'See what Jev gets' page"). Visual reference: `docs/screenshots/2-what-jev-gets.png`, ignoring everything about documents. Jev facts: `docs/research/jev-api.md`.

**What to build:** From the builder, "See what Jev gets" opens `/topics/[id]/jev`. It shows what this topic turns into in the one per-message Jev call and what that costs.

- **Questions.** Build the Jev request with v1 ticket 04's exported question building, using all published topics with this topic's draft swapped in. Show this topic's part:
  - its option in the topic question (name, description, examples);
  - each branch as a Choice with its paths and `not_stated`;
  - each rule as a yes/no question.

  There's a plain view and a raw request view, like screenshot 2's toggle.

- **Size and cost.**
  - Estimated input tokens for the whole call, and this topic's share. The estimate is based on character count and labelled as an estimate. The ratio is calibrated from the real `usage.input_tokens` of sample calls where available.
  - The share of Jev's 32,000-token context budget, as a meter.
  - The estimated cost per message at $0.042 per million input tokens.
  - A warning once the whole call is above 75% of the budget.
- **Sample message.** A box to type a customer message. Submitting it runs a real Jev call server-side through `decideTurn`, with the draft and the effective settings. The page then shows:
  - the answers and their confidences;
  - the exact input tokens;
  - the model version;
  - the path the walker takes and its outcome, similar to screenshot 2's "Result".

  The call is logged like every other Jev call, if the call log exists yet.

**Blocked by:** 02 — Read-only flow diagram; v1 ticket 04 — decideTurn (`.scratch/jevbot-v1/issues/04-decide-turn-for-a-fresh-message.md`)

**Status:** ready-for-agent

- [ ] For `return_policy`, the page lists its topic option, both branches with their paths plus `not_stated`, and its four rules as yes/no questions. The raw view shows the exact request structure.
- [ ] The token estimate, budget meter and cost appear. A test topic padded past 75% of the budget shows the warning.
- [ ] A sample message like "can i send back shoes i bought last week? still in the box" shows real Jev answers, exact token usage, the model version and the path taken.
- [ ] Draft changes (e.g. adding a path) are reflected on the page before publishing.
- [ ] `npm run check`, `npm run lint` and `npm test` pass.
