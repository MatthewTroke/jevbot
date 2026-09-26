# 09 — Eval script

**Spec:** `.scratch/jevbot-v1/spec.md` (see "Eval script" and user stories 47–49).

**What to build:** A command the developer runs to measure how accurately the real Jev plus the flow walker handle a list of sample messages, so they can tune question wording and thresholds.

- An npm script reads cases from a JSON file. Each case has:
  - a customer message;
  - optionally, earlier transcript and a waiting step, for multi-turn cases;
  - the expected topic (or `other`);
  - the expected path, as the sequence of step ids or just the final step.
- It runs in Node and gets the real Workers AI binding through Wrangler's platform proxy. It calls the same `decideTurn` and Jev adapter the app uses. By default it uses the published topics from the local D1, read through the same platform proxy, and the effective settings. A `--topics <folder>` option runs against exported topic JSON files instead. It doesn't write to D1.
- A `--preset` option picks Careful, Balanced or Confident; the default is the active preset.
- Output:
  - For each case: pass or fail, and on failure the expected and actual topic and path, with Jev's topic answer, the branch answers used and their confidences.
  - A summary with topic accuracy, path accuracy and case counts.
  - The model version that answered.
  - The exit code is non-zero if any case fails, so it can gate tuning changes.
- A starter case set covers:
  - clear questions for both topics;
  - a message that already answers the branch (e.g. "still in the box"), which skips the ask;
  - a medium-confidence question;
  - an off-topic message that should be `other`;
  - each `return_policy` handoff rule;
  - a multi-turn case answering a waiting button question;
  - a topic switch while waiting.
- The script is not part of `npm test`, because it costs credits and needs `wrangler login`. Its usage is documented in the README.

**Blocked by:** 06 — Multi-turn: waiting on ask_customer; flow-builder 01 — Topics stored in D1, listed on /topics (`.scratch/flow-builder/issues/01-topics-stored-in-d1.md`)

**Status:** ready-for-agent

- [ ] Running the npm script calls real Jev and prints per-case results and the accuracy summary.
- [ ] `--preset` changes which thresholds are used, and running the same cases under two presets can give different outcomes.
- [ ] Multi-turn cases with a waiting step resume the waiting branch as the app does.
- [ ] Failures show enough detail (answers and confidences) to see whether wording or thresholds are at fault.
- [ ] The starter case set covers every item listed above.
- [ ] The README explains how to run it and the prerequisites (`wrangler login`, AI Gateway and Unified Billing).
- [ ] `npm run check`, `npm run lint` and `npm test` pass. `npm test` does not run the eval.
