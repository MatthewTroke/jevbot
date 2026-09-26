# 02 — Topic files load and show on /topics

**Spec:** `.scratch/jevbot-v1/spec.md` (see "Topic model"). Visual reference for the flow: `docs/screenshots/1-topic-flow-builder.png`.

**What to build:** Topics exist as JSON files, the app loads them at build time, and a read-only Topics page shows what loaded and any errors in the files.

- Define the topic format with Zod. Topic fields are `id`, `name`, a one-line `description`, 3–5 `examples`, `steps` and `connections`. There are seven step types: `when`, `check_rules`, `confidence_gate`, `branch`, `send_reply`, `ask_customer` and `hand_off`. Each connection has `from`, `to` and an outcome label.
- Write the two example topics in `src/lib/topics`, as the brief requires.
  - **`return_policy`** follows screenshot 1, without the documents fallback.
    - Rules: upset customer, damaged item, legal action or chargeback, asks for a person. A match hands off.
    - Gate: high goes to the condition branch. Medium goes to "Is this about a return?" (Yes/No buttons), which returns to a confirmation branch: `yes` continues to the condition branch, `no` gets a short reply, `not_stated` asks again. Low hands off.
    - Condition branch: `unworn` gets a reply with the return steps and the prepaid label, then marks resolved. `worn` gets the "worn items can't be returned" reply. `damaged` hands off, tagged "damaged item". `not_stated` asks "Has it been worn or used?" with three buttons, which returns to the branch.
  - **`shipping_times`** has its own rules, gate and a branch over shipping options, with a button question for `not_stated`. Reply text uses bracketed placeholders like "[3–5] business days".
- `loadTopics(files) → { topics, errors }` is a pure function. This ticket covers schema-level errors:
  - unknown step types, and missing or invalid fields;
  - fewer than 3 or more than 5 examples;
  - ids that aren't snake_case;
  - duplicate topic ids across files, and duplicate step ids within a topic;
  - `not_stated` or `other` used as an author-defined path or topic id.

  Each error names the file, the step or field, and the problem in plain words. Topics with errors are left out of the returned topics.

- The `/topics` page lists each valid topic (name, description, examples, steps, rules, connections) and every validation error.
- Add a simple shared layout with navigation between the app's pages.

**Blocked by:** 01 — Spike: Jev answers a hardcoded Choice from a server route

**Status:** ready-for-agent

- [ ] Both example topics load with zero errors.
- [ ] A unit test loads the real bundled topic files and asserts zero errors, so a bad edit to an example topic fails `npm test`.
- [ ] Each schema rule above has a unit test with a small invalid fixture. The test asserts the error names the file, the location and the problem.
- [ ] A topic with an error is excluded while the other topics still load.
- [ ] `/topics` shows the loaded topics and any errors.
- [ ] Temporarily adding a broken topic file shows a readable error on `/topics`.
- [ ] The scaffold's sample Vitest example is removed.
- [ ] `npm run check`, `npm run lint` and `npm test` pass.
