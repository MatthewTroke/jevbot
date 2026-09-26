# 08 — Debug panel

**Spec:** `.scratch/jevbot-v1/spec.md` (see user stories 40–43 and "Server and pages"). Visual reference for how answers read: `docs/screenshots/2-what-jev-gets.png`.

**What to build:** A debug panel beside the chat on `/chat` that explains every bot turn. For the selected turn (the latest by default), it shows:

- **The topic answer:** the chosen topic, its `confidence` and the probability of every option.
- **Every branch answer from the call:** the chosen path and confidence. The ones the walk actually used are marked; answers for other topics are shown as ignored.
- **Every handoff rule's probability** against the active `rule` threshold, with the ones that fired highlighted.
- **The path taken,** step by step: the answer used, the threshold applied and the outcome. Low-confidence answers treated as `not_stated`, topic switches, and the repeat-question cap are called out.
- **The active preset,** the model version that answered, latency and token usage.
- **A toggle** to show the raw Jev request and response.
- **Failures:** failed Jev calls show the error.

The panel reads from what 05 already saves: the turn trace on bot messages and the Jev call log. It survives reloads and works for earlier turns too.

**Blocked by:** 05 — Chat with saved conversations

**Status:** ready-for-agent

- [ ] After a turn in `/chat`, the panel shows the topic answer with confidence and probabilities, every branch answer (used or ignored), every rule probability and the step-by-step path.
- [ ] The panel shows the active preset, model version, latency and tokens for the turn.
- [ ] The raw request and response toggle shows exactly what was sent to and returned by Jev.
- [ ] Selecting an earlier bot message shows that turn's debug info. Reloading the page keeps it.
- [ ] A turn where a low-confidence branch answer was treated as `not_stated` is clearly labelled.
- [ ] A turn where the Jev call failed shows the error.
- [ ] The chat stays usable at phone width, with the panel collapsible or stacked below.
- [ ] `npm run check`, `npm run lint` and `npm test` pass.
