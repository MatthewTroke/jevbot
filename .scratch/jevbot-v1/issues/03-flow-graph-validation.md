# 03 — Flow graph validation

**Spec:** `.scratch/jevbot-v1/spec.md` (see "Topic loading").

**What to build:** `loadTopics` also checks that each topic's flow graph can be walked safely. A topic with a broken graph is rejected, and its errors show on `/topics` just like schema errors. After this ticket, the walker in 04 can trust that every valid topic has these properties:

- It has exactly one `when` step.
- Every connection's `from` and `to` point at existing steps.
- Every non-final step has exactly the outgoing labels its type needs, and no others:
  - `when`: one unlabelled connection;
  - `check_rules`: `matched` and `clear`;
  - `confidence_gate`: `high`, `medium` and `low`;
  - `branch`: one per path, plus `not_stated`.
- `send_reply`, `ask_customer` and `hand_off` end the turn and have no outgoing connections.
- Every branch has a `not_stated` connection.
- A `check_rules` step's `matched` connection leads to a `hand_off` step.
- Every `ask_customer` step returns to a `branch` in the same topic.
- There are no loops other than ask_customer return edges: the graph must be acyclic once those are removed.
- Every step is reachable from `when`, counting ask_customer return edges.
- No Choice has more than 255 options: the topic Choice (all valid topics plus `other`) and each branch Choice (its paths plus `not_stated`).

**Blocked by:** 02 — Topic files load and show on /topics

**Status:** ready-for-agent

- [ ] Each rule above has a unit test with a minimal invalid fixture. The test asserts the error names the file, the step and the problem in plain words.
- [ ] A topic containing the one allowed loop (ask_customer → its branch → `not_stated` → the same ask_customer) passes validation.
- [ ] Both example topics still load with zero errors.
- [ ] A topic that fails graph validation is excluded from matching while other topics still load.
- [ ] The topic-Choice limit is checked across all topics together, not per file.
- [ ] Temporarily adding a topic with a dead end or a loop shows clear errors on `/topics`.
- [ ] `npm run check`, `npm run lint` and `npm test` pass.
