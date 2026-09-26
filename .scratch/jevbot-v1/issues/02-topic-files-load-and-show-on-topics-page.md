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

**Status:** done

- [x] Both example topics load with zero errors.
- [x] A unit test loads the real bundled topic files and asserts zero errors, so a bad edit to an example topic fails `npm test`.
- [x] Each schema rule above has a unit test with a small invalid fixture. The test asserts the error names the file, the location and the problem.
- [x] A topic with an error is excluded while the other topics still load.
- [x] `/topics` shows the loaded topics and any errors.
- [x] Temporarily adding a broken topic file shows a readable error on `/topics`.
- [x] The scaffold's sample Vitest example is removed.
- [x] `npm run check`, `npm run lint` and `npm test` pass.

## Comments

**2026-09-26, implementation notes:**

- **Loader:** `loadTopics(files)` (in `src/lib/server/topics.ts`) takes raw file text (`{ file, source }`) and parses the JSON itself, so a syntax error shows on `/topics` instead of breaking the build. `bundled-topics.ts` bundles `src/lib/topics/*.json` with `import.meta.glob(..., { query: '?raw' })`, sorted by file name.
- **Errors** are `{ file, location, message }`. Locations name steps by id when the id is unique, e.g. `step "reply".text`, and by position otherwise, e.g. `steps[2].id`. Only the first problem at each location is reported. `checkTopic` returns key paths rendered the same way, so ticket 03's graph checks can reuse it.
- **Checks beyond the ticket list:**
  - unknown fields (strict objects);
  - a single-line `description`;
  - duplicate path ids within a branch and duplicate rule ids within a check_rules step, which the spec's "no duplicate ids" covers;
  - at least one step, rule, path and button.
- **Topic format:** `send_reply.resolve` defaults to false. `ask_customer` uses `returnsTo`. Connections are `{ from, to, on? }`, with no `on` for `when`.
- **Exported for later tickets:** `OTHER` / `NOT_STATED` and the `Topic` / `Step` types.
- **Duplicate topic ids:** the first valid file keeps the id; later files with the same id are rejected.
- **Graph rules:** both example topics were checked by hand against ticket 03's rules and should pass.
- **Example topic wording:** the `worn_items` reply says "ask to talk to a person". It's plain text that leads into the `wants_person` handoff rule, not a "Then: offer a person" button.
